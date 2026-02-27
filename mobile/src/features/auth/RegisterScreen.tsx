import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Title, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { setCredentials } from './authSlice';
import { useRegisterMutation } from '../../services/authApi';
import { useNavigation } from '@react-navigation/native';

const RegisterScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const [register, { isLoading }] = useRegisterMutation();

    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            name: '',
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: any) => {
        try {
            const userData = await register(data).unwrap();
            dispatch(setCredentials({ user: userData.user, token: userData.access_token }));
        } catch (err: any) {
            // RTK Query error handling
            const message = Array.isArray(err.data?.message)
                ? err.data.message.join('\n')
                : (err.data?.message || 'Registration failed');
            Alert.alert('Error', message);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Title style={styles.title}>Register</Title>

            <Controller
                control={control}
                rules={{ required: 'Name is required' }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        label="Name"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        mode="outlined"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        error={!!errors.name}
                    />
                )}
                name="name"
            />
            {errors.name && <Text style={styles.error}>{errors.name.message as string}</Text>}

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
                    />
                )}
                name="email"
            />
            {errors.email && <Text style={styles.error}>{errors.email.message as string}</Text>}

            <Controller
                control={control}
                rules={{ required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } }}
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
                Register
            </Button>

            <Button
                mode="text"
                onPress={() => navigation.navigate('Login' as never)}
                style={styles.link}
            >
                Already have an account? Login
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

export default RegisterScreen;
