import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput, Portal, Modal, ActivityIndicator, Avatar, Switch, useTheme } from 'react-native-paper';
import { useGetProfileQuery, useUpdateProfileMutation, useChangePasswordMutation } from '../services/usersApi';
import { useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { toggleTheme } from '../features/theme/themeSlice';
import { useNavigation } from '@react-navigation/native';

const ProfileScreen = () => {
    const theme = useTheme();
    const { data: profile, isLoading } = useGetProfileQuery();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
    const dispatch = useAppDispatch();
    const navigation = useNavigation();
    const themeMode = useAppSelector((state) => state.theme.mode);
    const isDarkMode = themeMode === 'dark';

    const handleToggleTheme = () => {
        dispatch(toggleTheme());
    };

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');

    const handleEditName = () => {
        setName(profile?.name || '');
        setEditModalVisible(true);
    };

    const handleSaveName = async () => {
        try {
            await updateProfile({ name }).unwrap();
            setEditModalVisible(false);
        } catch (err: any) {
            setError(err.data?.message || 'Failed to update name');
        }
    };

    const handleChangePassword = async () => {
        setError('');
        if (!oldPassword || !newPassword) {
            setError('Please fill in all fields');
            return;
        }
        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters');
            return;
        }
        try {
            await changePassword({ oldPassword, newPassword }).unwrap();
            setPasswordModalVisible(false);
            setOldPassword('');
            setNewPassword('');
        } catch (err: any) {
            setError(err.data?.message || 'Failed to change password');
        }
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    if (isLoading) {
        return <ActivityIndicator animating={true} style={styles.loader} />;
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
                <Avatar.Text size={80} label={getInitials(profile?.name || 'U')} style={styles.avatar} />
                <Text variant="headlineMedium" style={[styles.name, { color: theme.colors.onSurface }]}>{profile?.name}</Text>
                <Text variant="bodyMedium" style={[styles.email, { color: theme.colors.onSurfaceVariant }]}>{profile?.email}</Text>
                <Text variant="bodySmall" style={[styles.memberSince, { color: theme.colors.outline }]}>
                    Member since {new Date(profile?.createdAt || '').toLocaleDateString()}
                </Text>
            </View>

            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Account Settings</Text>
                    <View style={styles.settingRow}>
                        <Text variant="bodyLarge">Dark Mode</Text>
                        <Switch value={isDarkMode} onValueChange={handleToggleTheme} />
                    </View>
                    <Button mode="outlined" onPress={handleEditName} style={styles.button} icon="pencil">
                        Edit Name
                    </Button>
                    <Button mode="outlined" onPress={() => setPasswordModalVisible(true)} style={styles.button} icon="lock">
                        Change Password
                    </Button>
                    <Button mode="contained" onPress={handleLogout} style={styles.logoutButton} buttonColor="#F44336">
                        Logout
                    </Button>
                </Card.Content>
            </Card>

            <Portal>
                <Modal visible={editModalVisible} onDismiss={() => setEditModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="titleLarge">Edit Name</Text>
                    <TextInput
                        label="Name"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <Button mode="contained" onPress={handleSaveName} loading={isUpdating} style={styles.saveBtn}>
                        Save
                    </Button>
                </Modal>

                <Modal visible={passwordModalVisible} onDismiss={() => setPasswordModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="titleLarge">Change Password</Text>
                    <TextInput
                        label="Current Password"
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        secureTextEntry
                        style={styles.input}
                    />
                    <TextInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        style={styles.input}
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <Button mode="contained" onPress={handleChangePassword} loading={isChangingPassword} style={styles.saveBtn}>
                        Change Password
                    </Button>
                </Modal>
            </Portal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loader: {
        marginTop: 50,
    },
    header: {
        alignItems: 'center',
        padding: 30,
        paddingTop: 54,
        // backgroundColor removed, set dynamically
    },
    avatar: {
        marginBottom: 15,
    },
    name: {
        marginBottom: 5,
    },
    email: {
        marginBottom: 5,
    },
    memberSince: {
        // color removed
    },
    card: {
        margin: 15,
    },
    sectionTitle: {
        marginBottom: 15,
    },
    button: {
        marginBottom: 10,
    },
    logoutButton: {
        marginTop: 10,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modal: {
        padding: 20,
        margin: 20,
        borderRadius: 8,
    },
    input: {
        marginTop: 15,
    },
    error: {
        color: 'red',
        marginTop: 10,
    },
    saveBtn: {
        marginTop: 20,
    },
});

export default ProfileScreen;
