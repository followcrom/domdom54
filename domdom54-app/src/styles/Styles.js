import { StyleSheet } from "react-native";
import colors from "./colors";

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.page,
    justifyContent: "flex-start",
    alignItems: "center",
  },

  // The type only. The 80%-wide indented column it used to carry lives in
  // `titleBlock` below, because only one of the four screens with a title wants it -
  // MeditationHistory had to undo `width` and `marginLeft` property by property, and
  // Wisdom and Contact skipped this style altogether and redeclared the type instead.
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.brandStrong,
    marginTop: 10,
    marginBottom: 0,
    textAlign: "center",
  },

  // The indented column a message title sits in. Compose it onto `title`.
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

  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textInverse,
    marginLeft: 10,
    padding: 16,
  },

  // `buttonText`'s marginLeft is the gap after the icon, so a button with no icon
  // (Contact's) has to drop it or its label sits 10px off centre.
  buttonTextNoIcon: {
    marginLeft: 0,
  },

  // The shared text-input control. Contact, Discuss and Wisdom each had their own
  // full copy of these five properties; the radius and padding stay local because
  // the three fields are genuinely different sizes.
  // Label on the left, control or value on the right. Settings and MeditationHistory
  // between them had four verbatim copies of these three properties; padding and
  // rules stay local, because each row sits in a different container.
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Elevation. `shadowColor` is always black - it darkens a surface, it is not a
  // palette colour, which is why it is not a token choice.
  shadowSm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

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
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  listItemText: {
    textAlign: "center",
    color: colors.brandDeep,
    fontSize: 20,
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

  // The error line for the shared `useAudioPlayback` hook. Lives next to the
  // container it renders inside, so every screen with audio reports failure the
  // same way - Wisdom and Message had drifted into two identical copies of this.
  audioError: {
    color: colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});
