import { StyleSheet } from "react-native";
import colors from "./colors";

/**
 * List row geometry, exported because Meditations' FlatList has to declare the row height
 * up front in getItemLayout. Deriving the style and that constant from the same numbers is
 * what stops them drifting: they used to disagree by three pixels, which is invisible on one
 * row and compounds into misplaced scroll offsets down a long list.
 *
 * lineHeight is set explicitly for the same reason - without it the row height depends on
 * the platform's default leading for a 20pt font, which is not a number this file can know.
 * The tradeoff is that lineHeight does not follow the OS font-scale setting the way fontSize
 * does, so a very large accessibility scale will crowd the row before it clips it.
 */
const LIST_ITEM_VERTICAL_PADDING = 18;
const LIST_ITEM_LINE_HEIGHT = 26;
const LIST_ITEM_BORDER_WIDTH = 1;
export const LIST_ITEM_HEIGHT =
  LIST_ITEM_VERTICAL_PADDING * 2 + LIST_ITEM_LINE_HEIGHT + LIST_ITEM_BORDER_WIDTH; // 63

/**
 * Shared height for the app's two control bars - Moments' transport row and Meditations'
 * tab bar - so they read as one piece of chrome rather than two bars that happen to be
 * close. Derived from the transport row's own geometry (48pt icons, 10pt padding top and
 * bottom) since that one was fixed first; the tab bar centers its content into this height
 * instead of arriving at a near-match by coincidence.
 */
export const TOP_BAR_HEIGHT = 68; // 10 padding + 48 icon + 10 padding

/**
 * The icon size inside a PrimaryButton. A constant rather than a per-caller prop
 * because the button owns its own proportions - see PrimaryButton.renderIcon.
 */
export const BUTTON_ICON_SIZE = 28;

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.page,
    justifyContent: "flex-start",
    alignItems: "center",
  },

  // Unchanged. Contact and MeditationHistory both use this and Contact does not
  // override the alignment, so this stays centred - the card's left-aligned title is
  // `titleCard` below, not a change to the shared one.
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.brandStrong,
    marginTop: 10,
    marginBottom: 0,
    textAlign: "center",
  },

  // The title as it sits inside a Card, which is Wisdom and Messages. Replaces
  // `titleBlock`: Wisdom used `title` alone and Message used it with titleBlock's
  // 80% width and 10% left margin, so the same element sat differently on two
  // screens that are otherwise the same design. The card's padding insets it now,
  // and both screens use this same pair.
  // No textAlign here: it inherits `title`'s centre, which is what every other
  // screen using `title` already expects.
  titleCard: {
    marginTop: 0,
    marginBottom: 12,
    lineHeight: 33,
  },
  // 190, not 200. random_wisdom_landscape.jpg is 1024x500 (2.048:1), so at 390pt
  // wide its true height is 190.4 - the old 200 was cropping ~5% for no reason.
  // Push images are authored to the same ratio, so Message's frame matches too.
  image: {
    height: 190,
    resizeMode: "cover",
    width: "100%",
    alignSelf: "center",
    marginBottom: 0,
  },
  imageLandscape: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },

  /**
   * Three pieces, composed with a style array, because the card and the Discuss
   * composer are the same white surface at the same width and were otherwise
   * repeating a five-line shadow block each.
   *
   *   <View style={[styles.surface, styles.contentWidth, styles.cardPad]} />
   */

  // A raised white surface. It used to be a white rectangle on a #F2F2F2 page at
  // 1.12:1 with no shadow and no border, which is not enough to read as a surface -
  // so it got the shadow this file already defined in `shadowSm` and never used
  // here, and the page moved to a tint that puts it at 1.16:1.
  surface: {
    backgroundColor: colors.card,
    borderRadius: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  // The one content column. Everything that is not full-bleed sits on it.
  contentWidth: {
    width: "90%",
    alignSelf: "center",
  },

  // Interior padding belongs to the card, not to the text inside it: `textOutput`
  // carried padding:10 while `title` carried none, so the title ran to the card's
  // edges while the body sat 10px inside it and the two never shared a margin.
  cardPad: {
    marginTop: 14,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  // Landscape narrows the column; it comes after contentWidth in the array.
  textContainerLandscape: {
    width: "80%",
  },
  // No padding: `cardPad` owns the card's interior now. lineHeight is explicit
  // because 20pt body at the platform default leading is tight for a full paragraph.
  textOutput: {
    fontSize: 20,
    lineHeight: 28,
    textAlign: "left",
    color: colors.textPrimary,
  },
  textOutputLandscape: {
    fontSize: 20,
    textAlign: "center",
    padding: 10,
  },

  transportButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly", // or 'space-around'
    alignItems: "center",
    minHeight: TOP_BAR_HEIGHT,
  },

  transportButtonsStyle: {
    margin: 10, // Adds space around each button
  },

  // 300 wide as before, but the 48pt icons and the label's own padding:16 made each
  // button 79pt tall - three of them stacked put 237pt of solid brandStrong on a
  // screen whose whole job is to show one phrase. At a 28pt icon and padding here
  // rather than on the label they are 54pt, and Wisdom now fits without scrolling.
  //
  // The 2.5pt white border went with the grey page: it existed to cut the button
  // out of its background, which a radius and a tinted page do on their own. The
  // 1.5pt border that replaced it is the same colour as the fill, and exists only so
  // the disabled state can recolour it without the control changing size.
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 300,
    marginTop: 10,
    marginBottom: 0,
    backgroundColor: colors.brandStrong,
    borderColor: colors.brandStrong,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignSelf: "center",
  },

  // Disabled primary button. Not a dimmed blue fill - white-on-blue at 2.48:1 reads as
  // broken rather than unavailable - and not `alt`, which is now dark enough that a
  // textDisabled label would fall to 2.75:1 on it. A white fill with a border outline
  // keeps the label at 3.57:1.
  buttonContainerDisabled: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },

  buttonTextDisabled: {
    color: colors.textDisabled,
  },

  // marginLeft is the gap after the icon, which every button has. The padding that
  // used to be here is on `buttonContainer` now - height belongs to the control, not
  // to its label, and putting it on the label is what made the tap target uneven.
  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textInverse,
    marginLeft: 10,
  },

  // Label left, control or value right. Padding and rules stay local.
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Radius and padding stay local: the three fields are genuinely different sizes.
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
    color: colors.textPrimary,
    fontSize: 16,
  },

  // The invalid state for `input`. Colour only, so the field does not resize.
  inputError: {
    borderColor: colors.danger,
  },

  listContainer: {
    paddingHorizontal: 0,
    paddingBottom: 20,
  },

  // `divider` rather than `brandSurface`, which is what this was between b0d01f5 and
  // now. brandSurface is a near-white blue tint: against `card` and against `alt` it is
  // invisible, so the rows had no rule at all and the 1.30:1 banding was carrying the
  // whole list on its own. divider is the token the palette names for this exact job.
  listItem: {
    paddingVertical: LIST_ITEM_VERTICAL_PADDING,
    borderBottomWidth: LIST_ITEM_BORDER_WIDTH,
    borderBottomColor: colors.divider,
  },

  // fontSize and lineHeight are load-bearing: LIST_ITEM_HEIGHT is derived from them and
  // feeds Meditations' getItemLayout, so changing either here misplaces scroll offsets
  // without any visible breakage.
  //
  // No fontWeight: the default is what a resting row wants. 500 was tried and read as
  // too heavy down a full list - the row rule below is what gives the list structure,
  // not the type. Moments steps its own playing row up to 600.
  listItemText: {
    textAlign: "center",
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: LIST_ITEM_LINE_HEIGHT,
  },

  // The Listen control. Was a 60%-wide band with dashed rules top and bottom, which
  // read as a torn-out coupon rather than a control; it is a pill now, sized to its
  // contents and left-aligned to the card's text.
  //
  // 44pt tall exactly - 6 + 32 + 6 - which is the minimum comfortable hit target and
  // also the height the loading spinner is given, so the card does not resize when
  // playback is being prepared.
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 18,
    minHeight: 44,
    paddingLeft: 6,
    paddingRight: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 999,
    backgroundColor: colors.card,
  },

  // Playing. accentStrong is the palette's "right now", the same signal the active
  // tab uses; only the colour and the glyph change, so nothing moves on tap.
  audioContainerPlaying: {
    borderColor: colors.accent,
  },

  audioLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.brandStrong,
    marginLeft: 10,
  },

  audioLabelPlaying: {
    color: colors.accentStrong,
  },

  audioWrap: {
    alignSelf: "center",
  },

  // The glyph slot. Fixed at the icon's own size so the loading spinner, which is
  // smaller, does not pull the pill narrower while it spins.
  audioGlyph: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  // The error line for the shared `useAudioPlayback` hook.
  audioError: {
    color: colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});
