import { StyleSheet } from "react-native";
import colors from "./colors";

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.page,
    justifyContent: "flex-start",
    alignItems: "center",
  },

  content: {
    flex: 1,
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    width: "80%",
    fontWeight: "bold",
    color: colors.brandStrong,
    marginLeft: "10%",
    marginTop: 10,
    marginBottom: 0,
    textAlign: "center",
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
  text: {
    fontSize: 20,
    textAlign: "center",
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

  divider: {
    borderBottomColor: colors.brand,
    borderBottomWidth: 2,
    marginLeft: "8%",
    width: "84%",
    marginTop: 10,
    marginBottom: 10,
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
});
