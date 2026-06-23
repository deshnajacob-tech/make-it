from ursina import *
from ursina.prefabs.first_person_controller import FirstPersonController
from ursina.lights import DirectionalLight, AmbientLight
from perlin_noise import PerlinNoise
from PIL import Image, ImageDraw
import random, math, os

# ─── Constants ────────────────────────────────────────────────────────────────
WORLD_SIZE  = 35
SEA_LEVEL   = 6
TREE_CHANCE = 0.06

# ─── Texture Generation (Pillow, runs before Ursina window opens) ─────────────
_TEX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures')
os.makedirs(_TEX_DIR, exist_ok=True)

_rng = random.Random(99)

def _sp(r, g, b, var=20):
    """Return a speckled RGBA pixel near (r, g, b)."""
    v = _rng.randint(-var, var)
    return (max(0, min(255, r+v)), max(0, min(255, g+v)), max(0, min(255, b+v)), 255)

def _save(name, fn, size=64):
    path = os.path.join(_TEX_DIR, f'{name}.png')
    if not os.path.exists(path):
        img = fn().resize((size, size), Image.NEAREST)
        img.save(path)
    return path

def _tex_grass():
    img = Image.new('RGBA', (16, 16))
    for x in range(16):
        for y in range(16):
            if y < 4:
                img.putpixel((x, y), _sp(50, 180, 20, 20))   # bright vivid green
            elif y < 7:
                t = (y - 4) / 3.0
                img.putpixel((x, y), _sp(int(50+(150-50)*t), int(180+(95-180)*t), int(20+(48-20)*t), 15))
            else:
                img.putpixel((x, y), _sp(150, 95, 48, 20))   # warm brown dirt
    return img

def _tex_dirt():
    img = Image.new('RGBA', (16, 16))
    for x in range(16):
        for y in range(16):
            img.putpixel((x, y), _sp(155, 100, 50, 22))
    for _ in range(12):
        img.putpixel((_rng.randint(0, 15), _rng.randint(0, 15)), (90, 55, 22, 255))
    return img

def _tex_stone():
    img = Image.new('RGBA', (16, 16))
    for x in range(16):
        for y in range(16):
            img.putpixel((x, y), _sp(145, 145, 145, 20))
    d = ImageDraw.Draw(img)
    for _ in range(4):
        d.line([(_rng.randint(0, 15), _rng.randint(0, 15)),
                (_rng.randint(0, 15), _rng.randint(0, 15))],
               fill=(85, 85, 85, 255), width=1)
    return img

def _tex_sand():
    img = Image.new('RGBA', (16, 16))
    for x in range(16):
        for y in range(16):
            img.putpixel((x, y), _sp(240, 210, 130, 15))
    return img

def _tex_water():
    img = Image.new('RGBA', (16, 16))
    for x in range(16):
        for y in range(16):
            w = int(math.sin((x + y) * 0.9) * 22)
            img.putpixel((x, y), (max(0, 30+w//3), max(0, 120+w), max(0, min(255, 230+w//2)), 255))
    return img

def _tex_ocean():
    img = Image.new('RGBA', (16, 16))
    for x in range(16):
        for y in range(16):
            w = int(math.sin((x*0.7 + y*0.4) * 1.1) * 14)
            img.putpixel((x, y), (max(0, 10+w//4), max(0, 55+w), max(0, min(255, 165+w)), 255))
    return img

def _tex_wood():
    img = Image.new('RGBA', (16, 16))
    for x in range(16):
        for y in range(16):
            d = math.sqrt((x-8)**2 + (y-8)**2)
            bases = [(185, 125, 60), (145, 90, 35), (200, 145, 75)]
            r, g, b = bases[int(d) % 3]
            img.putpixel((x, y), _sp(r, g, b, 8))
    return img

def _tex_leaves():
    img = Image.new('RGBA', (16, 16))
    for x in range(16):
        for y in range(16):
            img.putpixel((x, y), _sp(40, 160, 20, 30))
    for _ in range(18):
        img.putpixel((_rng.randint(0, 15), _rng.randint(0, 15)), (20, 100, 10, 255))
    return img

def _tex_snow():
    img = Image.new('RGBA', (16, 16))
    for x in range(16):
        for y in range(16):
            img.putpixel((x, y), _sp(245, 250, 255, 8))
    return img

TEX_PATHS = {
    'grass':  _save('grass',  _tex_grass),
    'dirt':   _save('dirt',   _tex_dirt),
    'stone':  _save('stone',  _tex_stone),
    'sand':   _save('sand',   _tex_sand),
    'water':  _save('water',  _tex_water),
    'ocean':  _save('ocean',  _tex_ocean),
    'wood':   _save('wood',   _tex_wood),
    'leaves': _save('leaves', _tex_leaves),
    'snow':   _save('snow',   _tex_snow),
}

# ─── App ──────────────────────────────────────────────────────────────────────
app = Ursina(title='Python Minecraft', borderless=False)
window.fps_counter.enabled = True
window.exit_button.visible = False
mouse.locked = False   # keep free until game starts so menu buttons are clickable

TEXTURES    = {name: load_texture(path) for name, path in TEX_PATHS.items()}
HOTBAR      = ['grass', 'dirt', 'stone', 'sand', 'wood', 'leaves', 'snow']
hotbar_index = 0
_started    = False
selected_label = None
hotbar_label   = None

# ─── Voxel ────────────────────────────────────────────────────────────────────
class Voxel(Button):
    def __init__(self, pos, block_type='grass'):
        super().__init__(
            parent=scene,
            position=pos,
            model='cube',
            texture=TEXTURES.get(block_type, TEXTURES['stone']),
            color=color.white,
            highlight_color=color.rgba(255, 255, 255, 60),
            collider='box',
        )
        self.block_type = block_type

    def input(self, key):
        if self.hovered:
            if key == 'left mouse down':
                destroy(self)
            elif key == 'right mouse down':
                Voxel(pos=self.position + mouse.normal, block_type=HOTBAR[hotbar_index])

# ─── Animals ──────────────────────────────────────────────────────────────────
_ANIMAL_SPECS = {
    'cow':     ((160,  82, 45),  (200, 120,  80), (1.2, 0.8, 0.7)),
    'pig':     ((255, 180, 160), (255, 200, 180), (0.9, 0.6, 0.5)),
    'chicken': ((230, 230, 230), (255, 200,   0), (0.5, 0.4, 0.4)),
    'sheep':   ((220, 220, 220), (180, 160, 140), (1.0, 0.8, 0.6)),
}

class Animal(Entity):
    def __init__(self, pos, animal_type, surface_map):
        super().__init__(position=pos)
        self.surface_map = surface_map
        self.walk_speed  = random.uniform(1.5, 3.0)
        self.move_timer  = random.uniform(0, 4)
        self.dir         = Vec3(0, 0, 0)
        self.resting     = True

        bc, hc, (bx, by, bz) = _ANIMAL_SPECS[animal_type]
        Entity(parent=self, model='cube', color=color.rgb(*bc), scale=(bx, by, bz))
        Entity(parent=self, model='cube', color=color.rgb(*hc),
               scale=(bx*0.5, by*0.55, bz*0.55),
               position=(bx * 0.65, by * 0.05, 0))

    def update(self):
        self.move_timer -= time.dt
        if self.move_timer <= 0:
            if self.resting:
                angle = random.uniform(0, 360)
                self.dir = Vec3(math.sin(math.radians(angle)), 0,
                                math.cos(math.radians(angle)))
                self.rotation_y = angle
                self.move_timer = random.uniform(2, 5)
                self.resting    = False
            else:
                self.dir        = Vec3(0, 0, 0)
                self.move_timer = random.uniform(1, 3)
                self.resting    = True

        nx = max(1, min(WORLD_SIZE - 2, self.x + self.dir.x * self.walk_speed * time.dt))
        nz = max(1, min(WORLD_SIZE - 2, self.z + self.dir.z * self.walk_speed * time.dt))
        surf_y = self.surface_map.get((int(nx), int(nz)), int(self.y) - 1)

        # Only step onto ground of similar height (no cliff-diving or water-walking)
        if abs(surf_y - (int(self.y) - 1)) <= 1 and surf_y >= SEA_LEVEL:
            self.x = nx
            self.z = nz
            self.y = surf_y + 1

# ─── World Generation ─────────────────────────────────────────────────────────
def _place_tree(x, surf_y, z):
    trunk_h = random.randint(4, 6)
    for ty in range(1, trunk_h + 1):
        Voxel(pos=(x, surf_y + ty, z), block_type='wood')
    top = surf_y + trunk_h
    for dx in range(-2, 3):
        for dy in range(-1, 3):
            for dz in range(-2, 3):
                dist = abs(dx) + abs(dy) + abs(dz)
                if dist <= 4 and not (dx == 0 and dz == 0 and dy <= 0):
                    Voxel(pos=(x+dx, top+dy, z+dz), block_type='leaves')

def generate_world():
    seed = random.randint(1, 9999)
    hn   = PerlinNoise(octaves=4, seed=seed)
    surface_map   = {}
    tree_spots    = []
    animal_spawns = []

    for x in range(WORLD_SIZE):
        for z in range(WORLD_SIZE):
            n = hn([x / WORLD_SIZE, z / WORLD_SIZE])
            h = int(n * 16) + 9   # height range ~1–17

            surface_map[(x, z)] = h

            # Terrain columns
            for y in range(h + 1):
                if y == h:
                    if h <= SEA_LEVEL:
                        t = 'sand'
                    elif h >= 19:
                        t = 'snow'
                    else:
                        t = 'grass'
                elif y >= h - 3:
                    t = 'dirt'
                else:
                    t = 'stone'
                Voxel(pos=(x, y, z), block_type=t)

            # Water / deep ocean fill
            if h < SEA_LEVEL:
                for y in range(h + 1, SEA_LEVEL + 1):
                    t = 'ocean' if (SEA_LEVEL - h) >= 3 else 'water'
                    Voxel(pos=(x, y, z), block_type=t)

            # Trees on grass well above water
            elif SEA_LEVEL + 2 < h < 18 and random.random() < TREE_CHANCE:
                tree_spots.append((x, h, z))

            # Potential animal spawns on flat inland grass
            if SEA_LEVEL + 1 < h < 17 and random.random() < 0.014:
                animal_spawns.append((x, h + 1, z))

    return surface_map, tree_spots, animal_spawns

def generate_clouds():
    for _ in range(25):
        cx = random.randint(3, WORLD_SIZE - 3)
        cz = random.randint(3, WORLD_SIZE - 3)
        cy = random.randint(30, 36)
        w  = random.randint(3, 6)
        d  = random.randint(2, 5)
        for dx in range(w):
            for dz in range(d):
                Entity(model='cube', color=color.white,
                       scale=(1, 0.45, 1),
                       position=(cx + dx, cy, cz + dz))

# ─── Start menu ───────────────────────────────────────────────────────────────
_menu_panel = Entity(
    parent=camera.ui, model='quad',
    color=color.rgba(10, 12, 28, 245),
    scale=(2, 2), z=-1,
)
Text('Python Minecraft', parent=camera.ui, position=(0, 0.26),
     origin=(0, 0), scale=2.8, color=color.rgb(255, 200, 40))
Text('3D Voxel World', parent=camera.ui, position=(0, 0.13),
     origin=(0, 0), scale=1.3, color=color.rgb(160, 160, 160))

_loading = Text('Generating world...', parent=camera.ui, position=(0, 0),
                origin=(0, 0), scale=1.5, color=color.white, enabled=False)

_btn_start = Button(
    text='Start Game', parent=camera.ui,
    position=(0, -0.06), scale=(0.28, 0.09),
    color=color.rgb(40, 130, 40),
    highlight_color=color.rgb(60, 170, 60),
)
_btn_quit = Button(
    text='Quit', parent=camera.ui,
    position=(0, -0.20), scale=(0.28, 0.09),
    color=color.rgb(130, 40, 40),
    highlight_color=color.rgb(170, 60, 60),
)


def _do_start():
    global _started, selected_label, hotbar_label

    _menu_panel.enabled = False
    for e in _menu_panel.children[:]:
        e.enabled = False
    _loading.enabled = False

    # Build world
    surface_map, tree_spots, animal_spawns = generate_world()
    for (tx, ty, tz) in tree_spots:
        _place_tree(tx, ty, tz)
    generate_clouds()
    _TYPES = ['cow', 'pig', 'chicken', 'sheep']
    for (ax, ay, az) in animal_spawns[:25]:
        Animal(pos=(ax, ay, az),
               animal_type=random.choice(_TYPES),
               surface_map=surface_map)

    player = FirstPersonController()
    player.speed       = 6
    player.jump_height = 1.5
    player.position    = (WORLD_SIZE // 2, 30, WORLD_SIZE // 2)
    mouse.locked = True   # lock mouse for WASD + mouse-look to work

    # Lighting — without this blocks look completely flat
    sun = DirectionalLight()
    sun.look_at(Vec3(1, -2, 1))
    sun.color = color.rgb(255, 240, 210)   # warm sunlight

    fill = DirectionalLight()
    fill.look_at(Vec3(-1, -0.5, -1))
    fill.color = color.rgb(80, 100, 160)   # cool sky-fill from opposite side

    AmbientLight(color=color.rgba(90, 110, 140, 255))  # base light so shadows aren't black

    # Blue sky
    sky = Sky()
    sky.color = color.rgb(100, 165, 230)

    # Crosshair — two thin lines are clearer than a text '+'
    Entity(model='quad', color=color.white, scale=(0.002, 0.04), parent=camera.ui)
    Entity(model='quad', color=color.white, scale=(0.04, 0.002), parent=camera.ui)

    # Hotbar background panel
    Entity(model='quad', color=color.rgba(0, 0, 0, 160),
           scale=(0.62, 0.065), position=(0, -0.455), parent=camera.ui)

    selected_label = Text('', position=(0, -0.44), origin=(0, 0),
                          scale=1.5, color=color.yellow, parent=camera.ui)
    hotbar_label   = Text('', position=(0, -0.48), origin=(0, 0),
                          scale=1.1, color=color.rgb(200, 200, 200), parent=camera.ui)

    # Controls hint — dark background so it's readable over any terrain
    Entity(model='quad', color=color.rgba(0, 0, 0, 140),
           scale=(0.72, 0.038), position=(0, 0.456), parent=camera.ui)
    Text('WASD: move   Space: jump   LMB: break   RMB: place   1-7/scroll: block   ESC: quit',
         position=(0, 0.453), origin=(0, 0), scale=0.75,
         color=color.rgb(220, 220, 220), parent=camera.ui)

    _started = True
    update_hotbar()


def _on_start_click():
    _btn_start.enabled = False
    _btn_quit.enabled  = False
    _loading.enabled   = True
    invoke(_do_start, delay=0.05)


_btn_start.on_click = _on_start_click
_btn_quit.on_click  = application.quit


def update_hotbar():
    if selected_label is None:
        return
    selected_label.text = f'[ {HOTBAR[hotbar_index]} ]'
    hotbar_label.text   = '  '.join(HOTBAR[i] for i in range(len(HOTBAR)) if i != hotbar_index)


def input(key):
    global hotbar_index
    if not _started:
        if key == 'escape':
            application.quit()
        return
    if key == 'scroll up':
        hotbar_index = (hotbar_index - 1) % len(HOTBAR)
        update_hotbar()
    elif key == 'scroll down':
        hotbar_index = (hotbar_index + 1) % len(HOTBAR)
        update_hotbar()
    else:
        for i in range(len(HOTBAR)):
            if key == str(i + 1):
                hotbar_index = i
                update_hotbar()
                break
    if key == 'escape':
        application.quit()


app.run()
