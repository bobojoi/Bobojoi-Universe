import Phaser from 'phaser';
import { getWorldDepth } from '../constants/CharacterVisualConstants';
import { COLORS, DEPTH } from '../constants/GameConstants';

const WALL_BOTTOM_Y = 520;
const ROOM_MARGIN = 120;
const BASEBOARD_HEIGHT = 26;
const FLOOR_PLANK_HEIGHT = 74;
const FLOOR_BOARD_WIDTH = 280;
const WINDOW_X = 360;
const WINDOW_Y = 280;
const WINDOW_WIDTH = 310;
const WINDOW_HEIGHT = 210;
const MISSION_BOARD_X = 760;
const MISSION_BOARD_Y = 430;
const PARTICLE_COUNT = 18;
const AMBIENT_BUBBLE_COUNT = 12;

export interface StudioEnvironmentResult {
  missionBoardTarget: Phaser.GameObjects.Container;
}

/** Builds the artist studio as layered code-native scenery behind existing gameplay. */
export class StudioEnvironment {
  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly worldWidth: number,
    private readonly worldHeight: number,
  ) {}

  public create(): StudioEnvironmentResult {
    this.drawArchitecture();
    this.drawWindowAndPrismLight();
    this.drawCenterRug();
    this.drawRecordWall();
    this.drawMissionBoard();
    this.drawBubbleWorkbench();
    this.drawToolCabinet();
    this.drawBookshelf();
    this.drawPhotoEasel();
    this.drawGlobe();
    this.drawPropCrate();
    this.drawPlantsAndTrophies();
    this.createAmbientParticles();
    return { missionBoardTarget: this.createMissionBoardTarget() };
  }

  /** Warm plaster and long wood boards replace the former abstract grid. */
  private drawArchitecture(): void {
    const graphics = this.scene.add.graphics().setDepth(DEPTH.BACKGROUND);
    graphics.fillStyle(COLORS.WALL_SHADOW, 1);
    graphics.fillRect(0, 0, this.worldWidth, this.worldHeight);
    graphics.fillStyle(COLORS.WALL, 1);
    graphics.fillRoundedRect(
      ROOM_MARGIN,
      ROOM_MARGIN,
      this.worldWidth - ROOM_MARGIN * 2,
      WALL_BOTTOM_Y - ROOM_MARGIN,
      34,
    );
    graphics.fillStyle(COLORS.WOOD, 1);
    graphics.fillRect(
      ROOM_MARGIN,
      WALL_BOTTOM_Y,
      this.worldWidth - ROOM_MARGIN * 2,
      this.worldHeight - WALL_BOTTOM_Y - ROOM_MARGIN,
    );
    graphics.fillStyle(COLORS.WOOD_DARK, 1);
    graphics.fillRect(
      ROOM_MARGIN,
      WALL_BOTTOM_Y - BASEBOARD_HEIGHT,
      this.worldWidth - ROOM_MARGIN * 2,
      BASEBOARD_HEIGHT,
    );

    graphics.lineStyle(2, 0xb9825c, 0.44);
    for (let y = WALL_BOTTOM_Y; y < this.worldHeight - ROOM_MARGIN; y += FLOOR_PLANK_HEIGHT) {
      graphics.lineBetween(ROOM_MARGIN, y, this.worldWidth - ROOM_MARGIN, y);
      const row = Math.floor((y - WALL_BOTTOM_Y) / FLOOR_PLANK_HEIGHT);
      const offset = row % 2 === 0 ? 0 : FLOOR_BOARD_WIDTH / 2;
      for (let x = ROOM_MARGIN + offset; x < this.worldWidth - ROOM_MARGIN; x += FLOOR_BOARD_WIDTH) {
        graphics.lineBetween(x, y, x, Math.min(y + FLOOR_PLANK_HEIGHT, this.worldHeight - ROOM_MARGIN));
      }
    }
    graphics.lineStyle(6, 0x241f35, 0.72);
    graphics.strokeRoundedRect(
      ROOM_MARGIN,
      ROOM_MARGIN,
      this.worldWidth - ROOM_MARGIN * 2,
      this.worldHeight - ROOM_MARGIN * 2,
      34,
    );

    this.scene.add
      .text(this.worldWidth / 2, 166, 'BOBOJOI  ·  BUBBLE ART STUDIO', {
        color: '#d8bfd7',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        letterSpacing: 7,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.WORLD_DECORATION);
  }

  /** A pastel prism beam is the room's visual signature and slowest ambient motion. */
  private drawWindowAndPrismLight(): void {
    const shadow = this.scene.add
      .rectangle(WINDOW_X + 12, WINDOW_Y + 14, WINDOW_WIDTH + 30, WINDOW_HEIGHT + 30, 0x211d33, 0.44)
      .setDepth(DEPTH.WORLD_DECORATION);
    const window = this.scene.add.graphics().setDepth(DEPTH.WORLD_DECORATION + 0.1);
    window.fillStyle(0x8ec7d7, 1);
    window.fillRoundedRect(
      WINDOW_X - WINDOW_WIDTH / 2,
      WINDOW_Y - WINDOW_HEIGHT / 2,
      WINDOW_WIDTH,
      WINDOW_HEIGHT,
      18,
    );
    window.fillStyle(0xdff9f3, 0.36);
    window.fillCircle(WINDOW_X - 64, WINDOW_Y - 36, 48);
    window.lineStyle(15, COLORS.CREAM, 1);
    window.strokeRoundedRect(
      WINDOW_X - WINDOW_WIDTH / 2,
      WINDOW_Y - WINDOW_HEIGHT / 2,
      WINDOW_WIDTH,
      WINDOW_HEIGHT,
      18,
    );
    window.lineStyle(9, 0x6d5064, 1);
    window.lineBetween(WINDOW_X, WINDOW_Y - WINDOW_HEIGHT / 2, WINDOW_X, WINDOW_Y + WINDOW_HEIGHT / 2);
    window.lineBetween(WINDOW_X - WINDOW_WIDTH / 2, WINDOW_Y, WINDOW_X + WINDOW_WIDTH / 2, WINDOW_Y);

    const light = this.scene.add.graphics().setDepth(DEPTH.WORLD_DECORATION + 0.02);
    light.fillStyle(0xfff2cf, 0.13);
    light.fillPoints([
      new Phaser.Geom.Point(WINDOW_X - 118, WINDOW_Y + 106),
      new Phaser.Geom.Point(WINDOW_X + 118, WINDOW_Y + 106),
      new Phaser.Geom.Point(1010, 1110),
      new Phaser.Geom.Point(520, 1110),
    ]);
    light.fillStyle(COLORS.MINT, 0.055);
    light.fillTriangle(390, 390, 720, 1090, 850, 1090);
    light.fillStyle(COLORS.PINK, 0.05);
    light.fillTriangle(430, 390, 830, 1090, 970, 1090);
    this.scene.tweens.add({
      targets: light,
      alpha: 0.64,
      duration: 3200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    shadow.setVisible(true);
  }

  private drawCenterRug(): void {
    const rug = this.scene.add.graphics().setDepth(getWorldDepth(870) - 0.8);
    rug.fillStyle(0x493a5f, 0.42);
    rug.fillEllipse(980, 875, 760, 390);
    rug.lineStyle(10, 0xe7b8cf, 0.38);
    rug.strokeEllipse(980, 875, 720, 350);
    rug.lineStyle(3, COLORS.MINT, 0.28);
    rug.strokeEllipse(980, 875, 640, 285);
  }

  private drawRecordWall(): void {
    const graphics = this.scene.add.graphics().setDepth(DEPTH.WORLD_DECORATION + 0.3);
    graphics.fillStyle(0x251f35, 0.45);
    graphics.fillRoundedRect(1352, 230, 420, 236, 18);
    graphics.fillStyle(0x694d58, 1);
    graphics.fillRoundedRect(1338, 216, 420, 236, 18);
    graphics.lineStyle(6, 0xd9b872, 0.9);
    graphics.strokeRoundedRect(1338, 216, 420, 236, 18);
    const records = [
      { x: 1405, label: '12.4m' },
      { x: 1518, label: '168' },
      { x: 1631, label: '∞' },
    ];
    for (const record of records) {
      graphics.fillStyle(0xefe1ca, 0.92);
      graphics.fillRoundedRect(record.x - 42, 278, 84, 98, 10);
      graphics.fillStyle(COLORS.PINK, 0.5);
      graphics.fillCircle(record.x, 303, 17);
      this.scene.add
        .text(record.x, 340, record.label, {
          color: '#3d3042',
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.WORLD_DECORATION + 0.4);
    }
    this.scene.add
      .text(1548, 245, 'WORLD RECORDS', {
        color: '#ffe0a5',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.WORLD_DECORATION + 0.4);
  }

  private drawMissionBoard(): void {
    const graphics = this.scene.add.graphics().setDepth(DEPTH.WORLD_DECORATION + 0.35);
    graphics.fillStyle(0x251f35, 0.42);
    graphics.fillRoundedRect(MISSION_BOARD_X - 178, MISSION_BOARD_Y - 106, 372, 230, 18);
    graphics.fillStyle(0x8c6552, 1);
    graphics.fillRoundedRect(MISSION_BOARD_X - 190, MISSION_BOARD_Y - 118, 372, 230, 18);
    graphics.lineStyle(8, 0xe7c894, 1);
    graphics.strokeRoundedRect(MISSION_BOARD_X - 190, MISSION_BOARD_Y - 118, 372, 230, 18);
    const cardColors = [0xfff0d6, 0xdaf5ec, 0xf7d7e7];
    cardColors.forEach((color, index) => {
      const x = MISSION_BOARD_X - 144 + index * 105;
      graphics.fillStyle(color, 0.95);
      graphics.fillRoundedRect(x, MISSION_BOARD_Y - 70 + (index % 2) * 12, 82, 106, 7);
      graphics.fillStyle(index === 1 ? COLORS.MINT : COLORS.PINK, 0.8);
      graphics.fillCircle(x + 41, MISSION_BOARD_Y - 57 + (index % 2) * 12, 6);
    });
    this.scene.add
      .text(MISSION_BOARD_X - 4, MISSION_BOARD_Y + 70, '任務製作板  ·  M', {
        color: '#fff0d3',
        fontFamily: 'Noto Sans TC, PingFang TC, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.WORLD_DECORATION + 0.4);
  }

  private drawBubbleWorkbench(): void {
    const graphics = this.scene.add.graphics().setDepth(getWorldDepth(760) + 0.03);
    graphics.fillStyle(0x392d3c, 0.42);
    graphics.fillEllipse(1260, 795, 380, 62);
    graphics.fillStyle(0x5e3f33, 1);
    graphics.fillRoundedRect(1080, 670, 360, 112, 16);
    graphics.fillStyle(0xc99668, 1);
    graphics.fillRoundedRect(1060, 638, 400, 74, 16);
    graphics.fillStyle(0x5e3f33, 1);
    graphics.fillRect(1092, 706, 28, 116);
    graphics.fillRect(1400, 706, 28, 116);
    graphics.fillStyle(0x99e8db, 0.45);
    graphics.fillCircle(1180, 638, 34);
    graphics.lineStyle(5, 0xe6faf5, 0.72);
    graphics.strokeCircle(1180, 638, 34);
    graphics.fillStyle(0xf1c3db, 0.8);
    graphics.fillRoundedRect(1304, 615, 62, 82, 8);
    graphics.lineStyle(6, 0x574454, 1);
    graphics.strokeRoundedRect(1304, 615, 62, 82, 8);

    const screenGlow = this.scene.add
      .rectangle(1335, 648, 48, 48, COLORS.MINT, 0.28)
      .setDepth(getWorldDepth(760) + 0.04);
    this.scene.tweens.add({
      targets: screenGlow,
      alpha: 0.62,
      duration: 1350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private drawToolCabinet(): void {
    const graphics = this.scene.add.graphics().setDepth(getWorldDepth(520));
    graphics.fillStyle(0x493745, 1);
    graphics.fillRoundedRect(1718, 398, 184, 218, 18);
    graphics.fillStyle(0x8a6659, 1);
    graphics.fillRoundedRect(1732, 414, 156, 184, 12);
    graphics.lineStyle(4, 0x493745, 1);
    graphics.lineBetween(1810, 414, 1810, 598);
    for (let y = 454; y < 590; y += 44) graphics.lineBetween(1732, y, 1888, y);
    graphics.fillStyle(COLORS.GOLD, 1);
    graphics.fillCircle(1796, 505, 5);
    graphics.fillCircle(1824, 505, 5);
  }

  private drawBookshelf(): void {
    const graphics = this.scene.add.graphics().setDepth(getWorldDepth(910) + 0.04);
    graphics.fillStyle(0x3b2930, 0.36);
    graphics.fillRoundedRect(1605, 720, 286, 330, 20);
    graphics.fillStyle(0x654333, 1);
    graphics.fillRoundedRect(1588, 700, 286, 330, 20);
    graphics.fillStyle(0x2e2738, 1);
    for (let row = 0; row < 3; row += 1) {
      const shelfY = 748 + row * 88;
      graphics.fillRoundedRect(1610, shelfY, 242, 66, 6);
      graphics.fillStyle(0xc56d83, 1);
      for (let book = 0; book < 7; book += 1) {
        const width = 15 + (book % 3) * 4;
        const height = 40 + ((book + row) % 3) * 8;
        graphics.fillStyle([0xc56d83, 0x78b9aa, 0xd4a858][book % 3] ?? 0xc56d83, 1);
        graphics.fillRoundedRect(1620 + book * 30, shelfY + 58 - height, width, height, 3);
      }
      graphics.fillStyle(0x2e2738, 1);
    }
  }

  private drawPhotoEasel(): void {
    const graphics = this.scene.add.graphics().setDepth(getWorldDepth(1120));
    graphics.lineStyle(12, 0x5e4033, 1);
    graphics.lineBetween(1100, 1015, 1050, 1190);
    graphics.lineBetween(1220, 1015, 1270, 1190);
    graphics.fillStyle(0x32293d, 1);
    graphics.fillRoundedRect(1065, 970, 190, 142, 12);
    graphics.fillStyle(0xf0d7bd, 1);
    graphics.fillRoundedRect(1080, 985, 160, 112, 8);
    graphics.fillStyle(COLORS.MINT, 0.5);
    graphics.fillCircle(1130, 1035, 28);
    graphics.fillStyle(COLORS.PINK, 0.5);
    graphics.fillCircle(1190, 1050, 34);
  }

  private drawGlobe(): void {
    const graphics = this.scene.add.graphics().setDepth(getWorldDepth(1120));
    graphics.fillStyle(0x5a3c31, 1);
    graphics.fillRoundedRect(455, 1162, 110, 22, 8);
    graphics.fillRect(502, 1088, 16, 80);
    graphics.fillStyle(0x7bc2c2, 1);
    graphics.fillCircle(510, 1042, 70);
    graphics.fillStyle(0x6ba573, 0.88);
    graphics.fillEllipse(486, 1024, 46, 30);
    graphics.fillEllipse(535, 1060, 54, 34);
    graphics.lineStyle(6, 0xd7b36e, 1);
    graphics.strokeCircle(510, 1042, 78);
  }

  private drawPropCrate(): void {
    const graphics = this.scene.add.graphics().setDepth(getWorldDepth(980));
    graphics.fillStyle(0x493129, 0.34);
    graphics.fillEllipse(720, 1022, 216, 46);
    graphics.fillStyle(0x774c35, 1);
    graphics.fillRoundedRect(628, 914, 184, 98, 14);
    graphics.lineStyle(8, 0xc38b5c, 1);
    graphics.strokeRoundedRect(628, 914, 184, 98, 14);
    graphics.lineBetween(720, 918, 720, 1008);
    graphics.fillStyle(COLORS.GOLD, 1);
    graphics.fillCircle(720, 966, 9);
  }

  private drawPlantsAndTrophies(): void {
    const plant = this.scene.add.graphics().setDepth(getWorldDepth(510));
    plant.fillStyle(0xb36d53, 1);
    plant.fillRoundedRect(1990, 448, 100, 88, 18);
    plant.fillStyle(COLORS.LEAF, 1);
    plant.fillEllipse(2010, 414, 48, 110);
    plant.fillEllipse(2052, 396, 52, 126);
    plant.fillEllipse(2080, 430, 46, 100);

    const trophy = this.scene.add.graphics().setDepth(DEPTH.WORLD_DECORATION + 0.4);
    trophy.fillStyle(COLORS.GOLD, 1);
    trophy.fillRoundedRect(1900, 323, 78, 20, 7);
    trophy.fillRect(1930, 274, 18, 52);
    trophy.fillEllipse(1939, 254, 72, 64);
    trophy.lineStyle(10, COLORS.GOLD, 1);
    trophy.strokeCircle(1895, 252, 28);
    trophy.strokeCircle(1983, 252, 28);
  }

  private createAmbientParticles(): void {
    const random = new Phaser.Math.RandomDataGenerator(['living-studio-art-009b']);
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const dust = this.scene.add
        .circle(
          random.between(ROOM_MARGIN + 40, this.worldWidth - ROOM_MARGIN - 40),
          random.between(170, this.worldHeight - ROOM_MARGIN - 30),
          random.between(1, 3),
          COLORS.CREAM,
          random.realInRange(0.12, 0.34),
        )
        .setDepth(DEPTH.WORLD_DECORATION + 0.8);
      this.scene.tweens.add({
        targets: dust,
        x: dust.x + random.between(24, 70),
        y: dust.y - random.between(20, 52),
        alpha: 0.04,
        duration: random.between(3600, 7200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
    for (let index = 0; index < AMBIENT_BUBBLE_COUNT; index += 1) {
      const bubble = this.scene.add
        .circle(
          random.between(ROOM_MARGIN + 80, this.worldWidth - ROOM_MARGIN - 80),
          random.between(WALL_BOTTOM_Y + 80, this.worldHeight - ROOM_MARGIN - 40),
          random.between(8, 22),
          index % 2 === 0 ? COLORS.MINT : COLORS.PINK,
          0.055,
        )
        .setStrokeStyle(2, COLORS.CREAM, 0.18)
        .setDepth(DEPTH.WORLD_DECORATION + 0.5);
      this.scene.tweens.add({
        targets: bubble,
        y: bubble.y - random.between(18, 48),
        alpha: 0.14,
        duration: random.between(2200, 4300),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  /** A transform-only hotspot lets the illustrated corkboard own the visual presentation. */
  private createMissionBoardTarget(): Phaser.GameObjects.Container {
    return this.scene.add
      .container(MISSION_BOARD_X, MISSION_BOARD_Y)
      .setSize(372, 230)
      .setDepth(DEPTH.WORLD_DECORATION + 0.45);
  }
}
