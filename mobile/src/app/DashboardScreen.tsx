import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image } from 'react-native';
import { Text, Button, Card, FAB as PaperFAB, Portal, Modal, TextInput, ActivityIndicator, useTheme, IconButton } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { RootState } from './store';
import { useGetGroupsQuery, useCreateGroupMutation } from '../services/groupsApi';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';


const DashboardScreen = () => {
    const theme = useTheme();
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const user = useSelector((state: RootState) => state.auth.user);
    const { data: groups, isLoading, error, refetch } = useGetGroupsQuery();
    const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();


    const [visible, setVisible] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const showModal = () => setVisible(true);
    const hideModal = () => setVisible(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Group name is required',
            });
            return;
        }
        try {
            await createGroup({ name: groupName, description: groupDesc }).unwrap();
            setGroupName('');
            setGroupDesc('');
            hideModal();
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Group created successfully!',
            });
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.data?.message || 'Failed to create group',
            });
        }
    };

    const renderGroupItem = ({ item }: { item: any }) => (
        <Card style={styles.card} onPress={() => (navigation as any).navigate('GroupDetails', { groupId: item.id, groupName: item.name })}>
            <Card.Title
                title={item.name}
                subtitle={
                    <View style={{ marginTop: 4 }}>
                        {item.description ? <Text variant="bodySmall" numberOfLines={1}>{item.description}</Text> : null}
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                            {item.membersCount !== undefined && (
                                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>👥 {item.membersCount} members</Text>
                            )}
                            {item.tasksCount !== undefined && (
                                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>📋 {item.tasksCount} tasks</Text>
                            )}
                        </View>
                    </View>
                }
            />
        </Card>
    );

    const renderContent = () => {
        if (isLoading && !refreshing) {
            return <ActivityIndicator animating={true} style={styles.loader} />;
        }
        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.error}>Error loading groups</Text>
                    <Button mode="outlined" onPress={() => refetch()} style={styles.retryBtn}>
                        Retry
                    </Button>
                </View>
            );
        }
        return (
            <FlatList
                data={groups}
                renderItem={renderGroupItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>No Groups Yet</Text>
                        <Text style={[styles.emptyText, { color: theme.colors.outline }]}>Create your first group to get started!</Text>
                    </View>
                }
            />
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Custom Welcome Header */}
            <View style={[styles.headerContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
                <Image source={require('../assets/logo.png')} style={styles.headerLogo} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.outline }}>Welcome,</Text>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>{user?.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconButton
                        icon="logout"
                        size={24}
                        onPress={() => dispatch(logout())}
                    />
                </View>
            </View>

            {/* My Groups Section Header */}
            <View style={styles.sectionHeader}>
                <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>My Groups</Text>
            </View>

            {renderContent()}

            <Portal>
                <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="headlineSmall" style={styles.modalTitle}>Create New Group</Text>
                    <TextInput
                        label="Group Name"
                        value={groupName}
                        onChangeText={setGroupName}
                        style={styles.input}
                    />
                    <TextInput
                        label="Description"
                        value={groupDesc}
                        onChangeText={setGroupDesc}
                        style={styles.input}
                    />
                    <Button mode="contained" onPress={handleCreateGroup} loading={isCreating} style={styles.button}>
                        Create
                    </Button>
                </Modal>
            </Portal>

            <PaperFAB
                style={styles.fab}
                icon="plus"
                onPress={showModal}
                label="New Group"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerLogo: {
        width: 45,
        height: 45,
        borderRadius: 8,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 40,
        paddingBottom: 20,
        borderBottomWidth: 1,
        elevation: 4,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    sectionTitle: {
        fontWeight: 'bold',
    },
    loader: {
        marginTop: 50,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    error: {
        color: 'red',
        fontSize: 16,
        marginBottom: 15,
    },
    retryBtn: {
        marginTop: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 100,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    list: {
        padding: 10,
        flexGrow: 1,
    },
    card: {
        marginBottom: 10,
        elevation: 2,
    },
    modal: {
        padding: 20,
        margin: 20,
        borderRadius: 8,
    },
    input: {
        marginTop: 15,
    },
    button: {
        marginTop: 20,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
    modalTitle: {
        marginBottom: 15,
        textAlign: 'center',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
    },
});


export default DashboardScreen;