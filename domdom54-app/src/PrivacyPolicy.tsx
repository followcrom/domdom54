import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
} from "react-native";
import styles, { radius } from "./styles/Styles";
import colors from "./styles/colors";
import { Sheet } from "./components/Layout";

const CONTACT_URL = "https://followcrom.com/contact/contact.php";
const DEEPSEEK_POLICY_URL =
  "https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html";
const ICO_URL = "https://ico.org.uk";

/**
 * The HTML renders this as a three-column table with `min-width: 32rem` and a
 * horizontal scrollbar - i.e. it does not fit a phone even on the web. Here the
 * same rows are transposed into a stack, one block per feature, so nothing
 * scrolls sideways.
 */
const HANDLED = [
  {
    feature: "Meditation history",
    data: "meditation name, practice date, length",
    stored: "Stored on your phone until you clear it in Settings or uninstall",
  },
  {
    feature: "Notifications",
    data: "push token, app version, os version, your phone's language region",
    stored:
      "Stored until you switch notifications off or uninstall",
  },
  {
    feature: "Discuss",
    data: "messages sent to DeepSeek to generate replies",
    stored: "Not stored by us or on your phone. See the warning below",
  },
  {
    feature: "Contact form",
    data: "name, email, subject, message",
    stored: "Deleted within 12 months",
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Opens the in-app Contact screen. The caller closes the sheet first. */
  onOpenContact: () => void;
};

/** A section heading. `<h2>` in the HTML. */
function H2({ children }: { children: React.ReactNode }) {
  return <Text style={policyStyles.h2}>{children}</Text>;
}

/** Body copy. Nest <Strong> and <Link> inside it for inline runs. */
function P({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[policyStyles.p, style]}>{children}</Text>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <Text style={policyStyles.strong}>{children}</Text>;
}

/** An inline link. Leaves the app, so every one of these is an external URL. */
function Link({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <Text
      style={styles.link}
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
    >
      {children}
    </Text>
  );
}

/** A list item. The bullet is a sibling Text so the copy wraps in its own column. */
function Bullet({ children, lede }: { children: React.ReactNode; lede?: boolean }) {
  return (
    <View style={policyStyles.bulletRow}>
      <Text style={[policyStyles.bulletMark, lede && policyStyles.ledeText]}>{"•"}</Text>
      <Text style={[policyStyles.p, policyStyles.bulletText, lede && policyStyles.ledeText]}>
        {children}
      </Text>
    </View>
  );
}

export default function PrivacyPolicy({ visible, onClose, onOpenContact }: Props) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Privacy Policy"
      height="90%"
      contentStyle={styles.sheetGutter}
    >
      <View style={policyStyles.lede}>
        <Bullet lede>
          RanDOM WisDOM is free, has no accounts and no sign-up. There are no
          adverts, no analytics and we never sell your data.
        </Bullet>
        <Bullet lede>
          We never collect advertising IDs, GPS location, contacts, photos or
          files. The app has no microphone access.
        </Bullet>
        <Bullet lede>Your meditation history stays on your phone.</Bullet>
        <Bullet lede>
          We only receive anything if you turn on notifications or write to us.
        </Bullet>
        <Bullet lede>
          Please note that the Discuss feature is provided by a third party and
          is subject to their privacy policy.
        </Bullet>
      </View>

      <H2>Who we are</H2>
      <P>
        The app is provided by <Strong>followCrom</Strong>, United Kingdom, who
        is the data controller. Contact us via the{" "}
        <Text style={styles.link} onPress={onOpenContact} accessibilityRole="link">
          Contact
        </Text>{" "}
        screen in the app or at{" "}
        <Link url={CONTACT_URL}>followcrom.com/contact</Link>.
      </P>

      <H2>What we handle</H2>
      {HANDLED.map((item, index) => (
        <View
          key={item.feature}
          style={[
            styles.ruledRow,
            policyStyles.dataRow,
            index === HANDLED.length - 1 && styles.ruledRowLast,
          ]}
        >
          <Text style={policyStyles.dataFeature}>{item.feature}</Text>
          <Text style={policyStyles.dataPair}>
            <Text style={policyStyles.dataLabel}>Data: </Text>
            {item.data}
          </Text>
          <Text style={policyStyles.dataPair}>
            <Text style={policyStyles.dataLabel}>Stored: </Text>
            {item.stored}
          </Text>
        </View>
      ))}

      <H2>The Discuss feature</H2>
      <View style={policyStyles.warn}>
        <P style={policyStyles.warnText}>
          <Strong>Don't type anything sensitive into Discuss.</Strong> Your
          messages go to <Strong>DeepSeek</Strong>'s servers{" "}
          <Strong>in China</Strong> – a country without a UK adequacy decision.
          DeepSeek may retain your messages and use them to train its models.
          You can review{" "}
          <Link url={DEEPSEEK_POLICY_URL}>DeepSeek's privacy policy</Link>.
          Every other part of the app works without the Discuss feature.
        </P>
      </View>

      <H2>Your rights</H2>
      <P>
        Under UK GDPR you can ask for access to your data, or its correction or
        deletion, and can withdraw consent at any time. Since there are no
        accounts, we may not be able to link data to you from your name alone.
      </P>
      <P>You can perform the following actions yourself:</P>
      <Bullet>Clear your history in Settings.</Bullet>
      <Bullet>Switch notifications off to delete your token.</Bullet>
      <P>
        For anything else, <Link url={CONTACT_URL}>contact us</Link> and we'll
        reply within a month.
      </P>
      <P>
        You can also complain to the ICO at{" "}
        <Link url={ICO_URL}>ico.org.uk</Link>.
      </P>

      <H2>Children</H2>
      <P>The app isn't aimed at under-13s and we don't collect their data.</P>

      <H2>Changes</H2>
      <P>
        We may update this privacy policy from time to time. You are advised to
        review it periodically, as any changes become effective once posted here.
      </P>

      <Text style={policyStyles.footer}>
        {"©"} followCrom {"·"} RanDOM WisDOM
      </Text>
    </Sheet>
  );
}

const policyStyles = StyleSheet.create({
  // The overlay, sheet, header and gutter live in <Sheet> (components/Layout.tsx),
  // shared with Meditation History.
  sub: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 18,
  },
  p: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    marginVertical: 6,
  },
  strong: {
    fontWeight: "bold",
  },
  // 20pt so a heading reads as one against 16pt body and the 17pt summary. The
  // space above it is what separates the sections now - the orange rules that did
  // that job were using `accent`, which the palette keeps for "right now" only.
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "bold",
    color: colors.brandStrong,
    marginTop: 28,
    marginBottom: 4,
  },
  // The opening summary carries the whole policy for most readers, so it is set
  // a shade larger than the body that follows it.
  lede: {
    marginBottom: 6,
  },
  ledeText: {
    fontSize: 17,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletMark: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    marginVertical: 6,
    width: 18,
  },
  bulletText: {
    flex: 1,
  },
  // One block per feature, ruled like a table body but stacked like a list.
  dataRow: {
    paddingVertical: 10,
  },
  dataFeature: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  dataPair: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  dataLabel: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  // The HTML's left-ruled callout, in the accent the palette already reserves.
  warn: {
    backgroundColor: colors.accentSurface,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentStrong,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
  },
  warnText: {
    marginVertical: 0,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    marginTop: 26,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    color: colors.textSecondary,
    fontSize: 14,
  },
});
