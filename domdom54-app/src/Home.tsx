import React from "react";
import {
  StyleSheet,
  View,
  Image,
  ImageBackground,
} from 'react-native';
import styles from './styles/Styles';
import { useIsLandscape } from './components/Layout';

export default function Home() {
  const isLandscape = useIsLandscape();

  // Landscape: show the wide artwork as a full-width banner at the top, reusing
  // the Wisdom (Text) screen's `imageLandscape` style so the two read
  // consistently and don't crop the scene awkwardly. Portrait keeps the
  // full-bleed background.
  if (isLandscape) {
    return (
      <View style={homePageStyles.landscapeContainer}>
        <Image
          source={require('../assets/images/random_wisdom_landscape.jpg')}
          style={styles.imageLandscape}
        />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/images/home.png')}
      resizeMode="cover"
      style={homePageStyles.backgroundImage}
    />
  );
}

const homePageStyles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  landscapeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
