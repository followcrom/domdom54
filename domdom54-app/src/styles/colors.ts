/**
 * The app's colour tokens. Every colour in `src/` comes from here.
 *
 * Each hue carries one meaning, and is published in steps with a contrast guarantee
 * attached, so picking a token never needs a judgement call about accessibility:
 *
 *   base    >= 3:1   on every surface  - icons 24px+, bars, rules, control borders
 *   strong  >= 4.5:1 both directions   - all text under 24px; also works as a fill
 *                                        because white type on it clears 4.5:1 too
 *   surface tint                       - panel backgrounds, guaranteed to hold their
 *                                        own strong step
 *
 * Ratios below are quoted against `card` / `page` - the lower one is what matters.
 * They are solved with headroom (4.68 and 3.18, not 4.5 and 3.0) so the palette does
 * not break if a background shifts slightly.
 *
 * Hues are drawn from the home screen artwork: its navy sits at 254deg, its orange at
 * 35deg, its red at 20deg.
 */
export const colors = {
  // --- Blue: the app itself. Identity, navigation, any control at rest. Never state.
  brand: "#1386FD", // 3.59 / 3.20 - transport icons, progress fill, dashed + section rules
  brandStrong: "#006AD0", // 5.29 / 4.72 - headings, links, primary button, now-playing row
  brandDeep: "#00468D", // 9.29 / 8.30 - list labels; the only blue that survives `alt`
  brandSurface: "#EEF5FF", // tint - informational panels

  // --- Orange: "right now". The tab you are on, the thing that is playing.
  // `accent` and `brand` have identical luminance, so they must never sit side by side -
  // that is why the playing transport icon uses accentStrong, not accent.
  accent: "#E8591C", // 3.57 / 3.19 - active tab icon and underline, and nothing else
  accentStrong: "#BF4205", // 5.25 / 4.69 - active tab label, readouts, pause-while-playing
  accentSurface: "#FFF1EC", // tint - unused today

  // --- Green: confirmation only. Never a play button.
  success: "#007C4C", // 5.27 / 4.70
  successSurface: "#E5FBED",

  // --- Red: loss only - errors and destructive actions. Never a stop button.
  danger: "#CA303D", // 5.25 / 4.69
  dangerSurface: "#FFF1F0", // tint - unused today

  // --- Ink
  textPrimary: "#26292E", // 14.59 / 13.04
  textSecondary: "#686C72", // 5.28 / 4.72 - supporting copy AND every placeholder
  textDisabled: "#84888D", // 3.57 / 3.19 - inactive tabs, unavailable controls
  textInverse: "#FFFFFF", // alias of white, for type sitting on a filled surface

  // --- Lines
  border: "#85888C", // 3.56 / 3.18 - input outlines. Identifies the control, so needs 3:1.
  divider: "#D7D9DC", // decorative rules, and the assistant chat bubble

  // --- Surfaces
  card: "#FFFFFF",
  page: "#F2F2F2", // React Navigation's own default, now declared rather than inherited
  alt: "#E0E2E5", // row banding, at the strength it has always been (1.30:1)


  // --- Scrims over photography. Not palette - they modulate an image, not a surface.
  shadow: "#000000", // elevation shadows - always black, never a surface colour

  // --- Platform config, not palette. ARGB, and read by Android rather than by any view.
  notificationLed: "#FF231F7C",
  scrimBackdrop: "#000000", // full-screen image viewer
  scrimOverlay: "rgba(0,0,0,0.5)", // modal dim
  scrimPanel: "rgba(255,255,255,0.8)", // player transport panel over the tiled background
  scrimStatusBar: "rgba(255,255,255,0.5)", // player status bar strip

  // --- Deferred: MeditationHistory is moving into Settings and will be redesigned there.
  // These two stripes are only 1.06:1 apart, which is close to no stripe at all without
  // colour. Left as-is deliberately; fix as part of the move, not before.
  historyRowA: "#e8f4fd",
  historyRowB: "#fff9e6",
} as const;

export default colors;
