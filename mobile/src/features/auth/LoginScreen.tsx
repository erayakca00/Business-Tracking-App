import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput, Button, Text, Title, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { setCredentials } from './authSlice';
import { useLoginMutation } from '../../services/authApi';
import { useNavigation } from '@react-navigation/native';

const LoginScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const [login, { isLoading }] = useLoginMutation();

    const { control, handleSubmit, setValue, formState: { errors } } = useForm({
        defaultValues: {
            email: '',
            password: '',
        },
    });

    React.useEffect(() => {
        const loadLastEmail = async () => {
            try {
                const lastEmail = await AsyncStorage.getItem('lastEmail');
                if (lastEmail) {
                    setValue('email', lastEmail);
                }
            } catch (e) {
                // ignore error
            }
        };
        loadLastEmail();
    }, [setValue]);

    const onSubmit = async (data: any) => {
        try {
            const userData = await login(data).unwrap();
            await AsyncStorage.setItem('lastEmail', data.email);
            dispatch(setCredentials({ user: userData.user, token: userData.access_token }));
            dispatch(setCredentials({ user: userData.user, token: userData.access_token }));
        } catch (err: any) {
            console.error('Login Error Full:', err);

            let displayMessage = 'Something went wrong';

            if (err?.data?.message) {
                const msg = err.data.message;
                displayMessage = Array.isArray(msg) ? msg.join(', ') : msg;
            } else if (err?.error) {
                displayMessage = err.error;
            } else if (err?.message) {
                displayMessage = err.message;
            } else {
                displayMessage = JSON.stringify(err);
            }

            Alert.alert('Login Failed', displayMessage);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Title style={styles.title}>Login</Title>

            <Controller
                control={control}
                rules={{
                    required: 'Email is required',
                    pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                    },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        label="Email"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        mode="outlined"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        error={!!errors.email}
                        autoCapitalize="none"
                        autoComplete="email"
                        textContentType="emailAddress"
                        keyboardType="email-address"
                    />
                )}
                name="email"
            />
            {errors.email && <Text style={styles.error}>{errors.email.message as string}</Text>}

            <Controller
                control={control}
                rules={{ required: 'Password is required' }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        label="Password"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        secureTextEntry
                        mode="outlined"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        error={!!errors.password}
                        autoComplete="password"
                        textContentType="password"
                    />
                )}
                name="password"
            />
            {errors.password && <Text style={styles.error}>{errors.password.message as string}</Text>}

            <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                style={styles.button}
            >
                Login
            </Button>

            <Button
                mode="text"
                onPress={() => navigation.navigate('Register' as never)}
                style={styles.link}
            >
                Don't have an account? Register
            </Button>

            <Button
                mode="text"
                onPress={() => navigation.navigate('ForgotPassword' as never)}
                style={styles.link}
            >
                Forgot your password?
            </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        // backgroundColor removed
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        marginBottom: 10,
    },
    button: {
        marginTop: 10,
        padding: 5,
    },
    link: {
        marginTop: 10,
    },
    error: {
        color: 'red',
        marginBottom: 10,
    },
});

export default LoginScreen;
