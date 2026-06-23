import pygame
import sys
import random

CELL = 20
COLS = 40
ROWS = 30
WIDTH = COLS * CELL   # 800
HEIGHT = ROWS * CELL  # 600
FPS = 10

BLACK   = (0, 0, 0)
WHITE   = (255, 255, 255)
GREEN   = (0, 200, 0)
DKGREEN = (0, 140, 0)
BLUE    = (0, 100, 255)
DKBLUE  = (0, 60, 180)
RED     = (220, 30, 30)
YELLOW  = (255, 220, 0)
GRAY    = (120, 120, 120)

UP    = (0, -1)
DOWN  = (0, 1)
LEFT  = (-1, 0)
RIGHT = (1, 0)


class Snake:
    def __init__(self, start, direction, color, head_color):
        self.body = [
            start,
            (start[0] - direction[0], start[1] - direction[1]),
            (start[0] - direction[0] * 2, start[1] - direction[1] * 2),
        ]
        self.direction = direction
        self.next_dir = direction
        self.color = color
        self.head_color = head_color
        self.alive = True
        self.score = 0
        self.grow = 0

    def set_direction(self, d):
        # Prevent 180-degree reversal
        if (d[0] + self.direction[0], d[1] + self.direction[1]) != (0, 0):
            self.next_dir = d

    def move(self):
        self.direction = self.next_dir
        hx, hy = self.body[0]
        new_head = (
            (hx + self.direction[0]) % COLS,
            (hy + self.direction[1]) % ROWS,
        )
        self.body.insert(0, new_head)
        if self.grow > 0:
            self.grow -= 1
        else:
            self.body.pop()
        return new_head

    def draw(self, surface):
        for i, seg in enumerate(self.body):
            rect = pygame.Rect(seg[0] * CELL, seg[1] * CELL, CELL, CELL)
            color = self.head_color if i == 0 else self.color
            pygame.draw.rect(surface, color, rect)
            pygame.draw.rect(surface, BLACK, rect, 1)


def spawn_food(snakes):
    occupied = set()
    for s in snakes:
        occupied.update(s.body)
    while True:
        pos = (random.randint(0, COLS - 1), random.randint(0, ROWS - 1))
        if pos not in occupied:
            return pos


def draw_hud(surface, font, p1, p2):
    p1_text = font.render(f"P1 (WASD): {p1.score}", True, GREEN)
    p2_text = font.render(f"P2 (Arrows): {p2.score}", True, BLUE)
    surface.blit(p1_text, (10, 5))
    surface.blit(p2_text, (WIDTH - p2_text.get_width() - 10, 5))


def game_over_screen(surface, font_big, font_small, p1, p2):
    overlay = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
    overlay.fill((0, 0, 0, 170))
    surface.blit(overlay, (0, 0))

    if p1.alive and not p2.alive:
        msg, color = "Player 1 Wins!", GREEN
    elif p2.alive and not p1.alive:
        msg, color = "Player 2 Wins!", BLUE
    else:
        msg, color = "It's a Draw!", YELLOW

    title = font_big.render(msg, True, color)
    scores = font_small.render(f"P1: {p1.score}   P2: {p2.score}", True, WHITE)
    hint = font_small.render("R = Restart     Q = Quit", True, GRAY)

    cx = WIDTH // 2
    cy = HEIGHT // 2
    surface.blit(title,  (cx - title.get_width() // 2,  cy - 70))
    surface.blit(scores, (cx - scores.get_width() // 2, cy))
    surface.blit(hint,   (cx - hint.get_width() // 2,   cy + 55))


def show_start_screen(screen, font_big, font_small):
    while True:
        screen.fill((10, 10, 18))

        title  = font_big.render("Two-Player Snake", True, GREEN)
        p1txt  = font_small.render("Player 1:  W A S D", True, GREEN)
        p2txt  = font_small.render("Player 2:  Arrow Keys", True, BLUE)
        prompt = font_small.render("Press  SPACE  to Start", True, WHITE)

        cx = WIDTH // 2
        screen.blit(title,  (cx - title.get_width()  // 2, HEIGHT // 4))
        screen.blit(p1txt,  (cx - p1txt.get_width()  // 2, HEIGHT // 2 - 44))
        screen.blit(p2txt,  (cx - p2txt.get_width()  // 2, HEIGHT // 2))
        screen.blit(prompt, (cx - prompt.get_width() // 2, HEIGHT * 3 // 4))

        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_SPACE, pygame.K_RETURN):
                    return
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Two-Player Snake")
    clock = pygame.time.Clock()

    font_big   = pygame.font.SysFont("Arial", 52, bold=True)
    font_small = pygame.font.SysFont("Arial", 28)
    font_hud   = pygame.font.SysFont("Arial", 20, bold=True)

    show_start_screen(screen, font_big, font_small)

    while True:
        p1 = Snake((COLS // 4,     ROWS // 2), RIGHT, GREEN, DKGREEN)
        p2 = Snake((3 * COLS // 4, ROWS // 2), LEFT,  BLUE,  DKBLUE)
        food = [spawn_food([p1, p2])]
        game_over = False

        while True:
            clock.tick(FPS)

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()

                if event.type == pygame.KEYDOWN:
                    if game_over:
                        if event.key == pygame.K_r:
                            break               # restart outer loop
                        if event.key == pygame.K_q:
                            pygame.quit()
                            sys.exit()
                    else:
                        if event.key == pygame.K_w:     p1.set_direction(UP)
                        elif event.key == pygame.K_s:   p1.set_direction(DOWN)
                        elif event.key == pygame.K_a:   p1.set_direction(LEFT)
                        elif event.key == pygame.K_d:   p1.set_direction(RIGHT)
                        if event.key == pygame.K_UP:    p2.set_direction(UP)
                        elif event.key == pygame.K_DOWN:  p2.set_direction(DOWN)
                        elif event.key == pygame.K_LEFT:  p2.set_direction(LEFT)
                        elif event.key == pygame.K_RIGHT: p2.set_direction(RIGHT)
            else:
                # No break from event loop — continue game logic
                if not game_over:
                    if p1.alive:
                        p1.move()
                    if p2.alive:
                        p2.move()

                    p1_head = p1.body[0]
                    p2_head = p2.body[0]

                    # Self-collision
                    if p1.alive and p1_head in p1.body[1:]:
                        p1.alive = False
                    if p2.alive and p2_head in p2.body[1:]:
                        p2.alive = False

                    # Head-on collision
                    if p1.alive and p2.alive and p1_head == p2_head:
                        p1.alive = False
                        p2.alive = False
                    else:
                        if p1.alive and p1_head in p2.body:
                            p1.alive = False
                        if p2.alive and p2_head in p1.body:
                            p2.alive = False

                    # Food
                    for f in list(food):
                        if p1.alive and p1_head == f:
                            p1.score += 10
                            p1.grow += 3
                            food.remove(f)
                            food.append(spawn_food([p1, p2]))
                        elif p2.alive and p2_head == f:
                            p2.score += 10
                            p2.grow += 3
                            food.remove(f)
                            food.append(spawn_food([p1, p2]))

                    if not p1.alive or not p2.alive:
                        game_over = True

                # Draw
                screen.fill((15, 15, 15))

                for x in range(0, WIDTH, CELL):
                    pygame.draw.line(screen, (25, 25, 25), (x, 0), (x, HEIGHT))
                for y in range(0, HEIGHT, CELL):
                    pygame.draw.line(screen, (25, 25, 25), (0, y), (WIDTH, y))

                for f in food:
                    cx = f[0] * CELL + CELL // 2
                    cy = f[1] * CELL + CELL // 2
                    pygame.draw.circle(screen, RED, (cx, cy), CELL // 2 - 2)
                    pygame.draw.circle(screen, (255, 100, 100), (cx, cy), CELL // 4)

                p1.draw(screen)
                p2.draw(screen)
                draw_hud(screen, font_hud, p1, p2)

                if game_over:
                    game_over_screen(screen, font_big, font_small, p1, p2)

                pygame.display.flip()
                continue

            break  # R was pressed — break inner loop to restart


if __name__ == "__main__":
    main()
