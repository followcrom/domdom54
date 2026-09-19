import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Vibration,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "../App";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles, { radius } from './styles/Styles';
import colors from './styles/colors';
import { PrimaryButton } from './components/PrimaryButton';

// Define types for form data and errors
interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

// The stack's own param list, not a local copy. Contact is a genuine stack
// route, so this one keeps its second argument - the `Home` the local copy also
// declared was never a stack route, and nothing here navigated to it.
type ContactScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Contact'
>;

interface ContactProps {
  navigation: ContactScreenNavigationProp;
}
export default function Contact({ navigation }: ContactProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  // The address the message went from, kept after the form is cleared so the
  // banner can show it - a mistyped email is only fixable while they are still here.
  const [sentEmail, setSentEmail] = useState<string>('');
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView | null>(null);

  // Validation function
  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Please tell us a bit more.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Submit form
  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        'https://4m06ktm0yh.execute-api.eu-west-2.amazonaws.com/prod/contact',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();

      // Reset form and show success banner
      setSentEmail(formData.email.trim());
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSubmissionSuccess(true);
      Vibration.vibrate(1000);

      // No redirect here — handled by the user via the banner button
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert(
        'Error',
        'Failed to send your message. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="height"
      style={contactStyles.container}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          contactStyles.scrollContent,
          { paddingTop: insets.top, paddingBottom: insets.bottom }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <View style={contactStyles.closeContainer}>
          <Ionicons
            name="close-circle-outline"
            size={40}
            color={colors.textSecondary}
            onPress={() => navigation.goBack()}
          />
        </View>
        <View style={contactStyles.formContainer}>
          <Text style={[styles.title, contactStyles.title]}>Contact Us</Text>
          <Text style={[styles.secondaryText, contactStyles.subtitle]}>
            We'd love to hear from you. Send us a message and we aim to reply within 48 hours.
          </Text>

          {submissionSuccess && (
            <View style={contactStyles.successBanner}>
              <Text style={contactStyles.successBannerText}>
                🎉 Message sent! We'll reply to{' '}
                <Text style={contactStyles.successEmail}>{sentEmail}</Text>.
              </Text>
              <TouchableOpacity
                style={contactStyles.successButton}
                onPress={() => {
                  setSubmissionSuccess(false);
                  navigation.goBack();
                }}
              >
                <Text style={contactStyles.successButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Name Input */}
          <View style={contactStyles.inputContainer}>
            <Text style={contactStyles.label}>Name *</Text>
            <TextInput
              style={[styles.input, contactStyles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Dolly Parton"
              placeholderTextColor={colors.textSecondary}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Email Input */}
          <View style={contactStyles.inputContainer}>
            <Text style={contactStyles.label}>Email *</Text>
            <TextInput
              style={[styles.input, contactStyles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="dolly@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Subject Input */}
          <View style={contactStyles.inputContainer}>
            <Text style={contactStyles.label}>Subject *</Text>
            <TextInput
              style={[styles.input, contactStyles.input, errors.subject && styles.inputError]}
              value={formData.subject}
              onChangeText={(value) => handleInputChange('subject', value)}
              placeholder="Hello Dolly"
              placeholderTextColor={colors.textSecondary}
            />
            {errors.subject && <Text style={styles.errorText}>{errors.subject}</Text>}
          </View>

          {/* Message Input */}
          <View style={contactStyles.inputContainer}>
            <Text style={contactStyles.label}>Message *</Text>
            <TextInput
              style={[
                styles.input,
                contactStyles.input,
                contactStyles.textArea,
                errors.message && styles.inputError,
              ]}
              value={formData.message}
              onChangeText={(value) => handleInputChange('message', value)}
              placeholder="What is it my love?"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
          </View>

          {/* Submit Button */}
          <PrimaryButton
            label={isLoading ? 'Sending...' : 'Send Message'}
            onPress={handleSubmit}
            disabled={isLoading}
            renderIcon={(color, size) => (
              <Ionicons name="chatbubbles-sharp" size={size} color={color} />
            )}
            accessibilityLabel="Send your message"
            accessibilityHint="Sends the message to our support team"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const contactStyles = StyleSheet.create({
  // The screen's own background. This style existed before and was never applied to
  // anything - the root carried an inline { flex: 1 } - so Contact's colour came from
  // the navigation theme and this `backgroundColor` did nothing at all.
  //
  // White rather than the page tint. Contact is a form - a column of bordered fields
  // and nothing else - and the tint gives it a colour cast it has no use for.
  //
  // `card`, not a new background token: the palette does not grow for this. The
  // trade-off is that the fields no longer sit ON a surface, they ARE the surface,
  // so they rely entirely on `border` to identify themselves - which is exactly the
  // job that token is published for, at 3.56:1 on white.
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  // No paddingBottom: the ScrollView sets it inline from the safe-area inset, which
  // overrode the 40 that used to be here.
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  closeContainer: {
    alignItems: "center",
    marginTop: 5,
    marginBottom: 0,
    padding: 5,
  },
  // Colour comes from `styles.title`; this only pulls it tight to the top of the form.
  title: {
    marginTop: 0,
    marginBottom: 5,
  },
  subtitle: {
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    padding: 15,
  },
  textArea: {
    minHeight: 100,
  },
  successBanner: {
    backgroundColor: colors.successSurface,
    borderColor: colors.success,
    borderWidth: 1,
    padding: 20,
    borderRadius: radius.md,
    marginBottom: 20,
    alignItems: 'center',
  },
  successBannerText: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  successEmail: {
    fontWeight: '700',
  },
  successButton: {
    backgroundColor: colors.success,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
  },
  successButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
});