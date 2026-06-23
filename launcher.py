import pygame
import sys
import subprocess
import os
import math
import random

pygame.init()

W, H = 700, 480
screen = pygame.display.set_mode((W, H))
pygame.display.set_caption('Game Launcher')
clock = pygame.time.Clock()

f_title = pygame.font.SysFont('Arial', 54, bold=True)
f_btn   = pygame.font.SysFont('Arial', 26, bold=True)
f_desc  = pygame.font.SysFont('Arial', 17)
f_sub   = pygame.font.SysFont('Arial', 19)

TITLE_COL = (255, 210, 50)
WHITE     = (255, 255, 255)
GRAY      = (160, 160, 160)
BG_TOP    = (10,  15, 30)
BG_BOT    = (20,  30, 55)
BTN_BLUE  = (45,  90, 180)
HOV_BLUE  = (70, 130, 240)
BTN_RED   = (160, 40, 40)
HOV_RED   = (210, 60, 60)
BORDER    = (80, 120, 200)
BORDER_H  = (100, 160, 255)

stars = [(random.randint(0, W), random.randint(0, H), random.uniform(0.4, 1.8))
         for _ in range(90)]

DIR = os.path.dirname(os.path.abspath(__file__))


class Btn:
    def __init__(self, rect, label, desc, cn, ch):
        self.rect  = pygame.Rect(rect)
        self.label = label
        self.desc  = desc
        self.cn, self.ch = cn, ch
        self.hover = False

    def update(self, pos):
        self.hover = self.rect.collidepoint(pos)

    def clicked(self, pos):
        return self.rect.collidepoint(pos)

    def draw(self, surf):
        c = self.ch if self.hover else self.cn
        b = BORDER_H if self.hover else BORDER
        pygame.draw.rect(surf, c, self.rect, border_radius=14)
        pygame.draw.rect(surf, b, self.rect, 2, border_radius=14)

        txt = f_btn.render(self.label, True, WHITE)
        ty  = self.rect.centery - txt.get_height() // 2 - (9 if self.desc else 0)
        surf.blit(txt, (self.rect.centerx - txt.get_width() // 2, ty))

        if self.desc:
            dtxt = f_desc.render(self.desc, True, (200, 200, 200))
            surf.blit(dtxt, (self.rect.centerx - dtxt.get_width() // 2,
                             ty + txt.get_height() + 2))


b_snake = Btn((W // 2 - 220, 195, 200, 92), 'Snake',     '2 Players · Keyboard', BTN_BLUE, HOV_BLUE)
b_mc    = Btn((W // 2 +  20, 195, 200, 92), 'Minecraft', '3D · Build & Explore',  BTN_BLUE, HOV_BLUE)
b_quit  = Btn((W // 2 -  80, 348, 160, 48), 'Quit',      '',                       BTN_RED,  HOV_RED)

t = 0.0

while True:
    dt = clock.tick(60) / 1000
    t += dt
    mp = pygame.mouse.get_pos()

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit(); sys.exit()
        if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            pygame.quit(); sys.exit()
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if b_snake.clicked(mp):
                pygame.quit()
                subprocess.Popen(['py', os.path.join(DIR, 'snake.py')])
                sys.exit()
            if b_mc.clicked(mp):
                pygame.quit()
                subprocess.Popen(['py', os.path.join(DIR, 'minecraft.py')])
                sys.exit()
            if b_quit.clicked(mp):
                pygame.quit(); sys.exit()

    b_snake.update(mp)
    b_mc.update(mp)
    b_quit.update(mp)

    # Gradient background
    for y in range(H):
        r2 = y / H
        pygame.draw.line(screen,
            (int(BG_TOP[0] + (BG_BOT[0]-BG_TOP[0])*r2),
             int(BG_TOP[1] + (BG_BOT[1]-BG_TOP[1])*r2),
             int(BG_TOP[2] + (BG_BOT[2]-BG_TOP[2])*r2)),
            (0, y), (W, y))

    # Twinkling stars
    for sx, sy, sz in stars:
        br = int(90 + 80 * math.sin(t * sz * 2 + sx * 0.1))
        r  = 1 if sz < 1.0 else 2
        pygame.draw.circle(screen, (br, br, br), (sx, sy), r)

    # Title
    title = f_title.render('Game Launcher', True, TITLE_COL)
    screen.blit(title, (W // 2 - title.get_width() // 2, 78))

    sub = f_sub.render('Select a game to play', True, GRAY)
    screen.blit(sub, (W // 2 - sub.get_width() // 2, 150))

    pygame.draw.line(screen, (55, 80, 140), (60, 178), (W - 60, 178), 1)

    b_snake.draw(screen)
    b_mc.draw(screen)
    b_quit.draw(screen)

    pygame.display.flip()
