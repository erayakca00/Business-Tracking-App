import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Title, useTheme } from 'react-native-paper';
import { useForgotPasswordMutation } from '../services/authApi';
import { useNavigation } from '@react-navigation/native';

const ForgotPasswordScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

    const handleSubmit = async () => {
        if (!email.trim()) {
            Alert.alert('Validation Error', 'Please enter your email address.');
            return;
        }

        try {
            const res = await forgotPassword({ email }).unwrap();
            Alert.alert(
                'Request Sent',
                res.message || 'If your email is registered, we have sent instructions to reset your password.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (err: any) {
            const message = err.data?.message || 'Failed to submit request.';
            Alert.alert('Error', message);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Title style={styles.title}>Reset Password</Title>
            <Text style={[styles.description, { color: theme.colors.outline }]}>
                Enter your email address and we will send you instructions to reset your password.
            </Text>

            <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                mode="outlined"
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
            />

            <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isLoading}
                style={styles.button}
            >
                Send Reset Link
            </Button>

            <Button
                mode="text"
                onPress={() => navigation.goBack()}
                style={styles.link}
            >
                Back to Login
            </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    input: {
        marginBottom: 15,
    },
    button: {
        marginTop: 10,
        padding: 5,
    },
    link: {
        marginTop: 10,
    },
});

export default ForgotPasswordScreen;
