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
export const LIST_ITEM_VERTICAL_PADDING = 18;
export const LIST_ITEM_LINE_HEIGHT = 26;
export const LIST_ITEM_BORDER_WIDTH = 1;
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

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.page,
    justifyContent: "flex-start",
    alignItems: "center",
  },

  // Type only - layout lives in `titleBlock`, which most titles do not want.
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.brandStrong,
    marginTop: 10,
    marginBottom: 0,
    textAlign: "center",
  },

  titleBlock: {
    width: "80%",
    marginLeft: "10%",
  },
  image: {
    height: 200,
    resizeMode: "cover",
    width: "100%",
    alignSelf: "center",
    marginBottom: 10,
  },
  imageLandscape: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },

  textContainer: {
    width: "90%",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: colors.card,
    borderRadius: 10,
  },
  textContainerLandscape: {
    width: "80%",
    alignSelf: "center",
    marginTop: 10,
  },
  textOutput: {
    fontSize: 20,
    textAlign: "left",
    padding: 10,
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

  buttonContainer: {
    alignItems: "center",
    width: 300,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: colors.brandStrong,
    borderColor: colors.card,
    borderWidth: 2.5,
    borderRadius: 20,
    padding: 10,
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

  buttonIcon: {
    flexDirection: "row",
  },

  // marginLeft is the gap after the icon, which every button has.
  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textInverse,
    marginLeft: 10,
    padding: 16,
  },

  // Label left, control or value right. Padding and rules stay local.
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // `shadowColor` is always black: it darkens a surface, it is not a palette choice.
  shadowSm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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

  listItem: {
    paddingVertical: LIST_ITEM_VERTICAL_PADDING,
    borderBottomWidth: LIST_ITEM_BORDER_WIDTH,
    borderBottomColor: colors.brandSurface,
  },

  listItemText: {
    textAlign: "center",
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: LIST_ITEM_LINE_HEIGHT,
  },

  audioContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
    width: "60%",
    alignSelf: "center",
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.brand,
    padding: 5,
  },

  // The error line for the shared `useAudioPlayback` hook.
  audioError: {
    color: colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});
