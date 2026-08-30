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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from './styles/Styles';
import colors from './styles/colors';

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

// Define navigation prop type
type RootStackParamList = {
  Home: undefined;
  Contact: undefined;
};

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
      style={{ flex: 1 }}
      keyboardVerticalOffset={50}
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
          <Text style={contactStyles.subtitle}>
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </Text>

          {submissionSuccess && (
            <View style={contactStyles.successBanner}>
              <Text style={contactStyles.successBannerText}>
                🎉 Message sent successfully!
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
              placeholder="Enter your full name"
              placeholderTextColor={colors.textSecondary}
            />
            {errors.name && <Text style={contactStyles.errorText}>{errors.name}</Text>}
          </View>

          {/* Email Input */}
          <View style={contactStyles.inputContainer}>
            <Text style={contactStyles.label}>Email *</Text>
            <TextInput
              style={[styles.input, contactStyles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter your email address"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={contactStyles.errorText}>{errors.email}</Text>}
          </View>

          {/* Subject Input */}
          <View style={contactStyles.inputContainer}>
            <Text style={contactStyles.label}>Subject *</Text>
            <TextInput
              style={[styles.input, contactStyles.input, errors.subject && styles.inputError]}
              value={formData.subject}
              onChangeText={(value) => handleInputChange('subject', value)}
              placeholder="What is this about?"
              placeholderTextColor={colors.textSecondary}
            />
            {errors.subject && <Text style={contactStyles.errorText}>{errors.subject}</Text>}
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
              placeholder="Enter your message here..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            {errors.message && <Text style={contactStyles.errorText}>{errors.message}</Text>}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              contactStyles.submitButton,
              styles.shadowMd,
              isLoading && styles.buttonContainerDisabled,
              isLoading && contactStyles.submitButtonDisabledOutline,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={[
              contactStyles.submitButtonText,
              isLoading && styles.buttonTextDisabled,
            ]}>
              {isLoading ? 'Sending...' : 'Send Message'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const contactStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.page,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
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
  // Overrides `styles.title`: this screen's heading is ink rather than brand blue,
  // and sits tight to the top of the form rather than 10px down.
  title: {
    color: colors.textPrimary,
    marginTop: 0,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
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
  // Composed onto `styles.input`. The textarea is that field plus a height - it used
  // to be a second full copy of all seven properties.
  input: {
    padding: 15,
  },
  textArea: {
    minHeight: 100,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: colors.brandStrong,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 0,
  },
  // The disabled fill and border colour come from `buttonContainerDisabled` in the
  // central sheet - this used to be a hand-maintained copy of them. Only the width
  // is local, because unlike the central button this one has no border at rest.
  submitButtonDisabledOutline: {
    borderWidth: 1,
  },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: colors.successSurface,
    borderColor: colors.success,
    borderWidth: 1,
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  successBannerText: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  successButton: {
    backgroundColor: colors.success,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  successButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});