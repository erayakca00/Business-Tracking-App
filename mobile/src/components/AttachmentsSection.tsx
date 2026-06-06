import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Linking,
    ActivityIndicator,
} from 'react-native';
import { Text, IconButton, useTheme, Divider } from 'react-native-paper';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { pick, isErrorWithCode, errorCodes, keepLocalCopy } from '@react-native-documents/picker';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../app/store';
import { BASE_URL, api } from '../services/api';
import {
    useGetAttachmentsQuery,
    useDeleteAttachmentMutation,
    uploadAttachment,
    Attachment,
} from '../services/attachmentsApi';
import Toast from 'react-native-toast-message';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'file-image-outline';
    if (mimeType.startsWith('video/')) return 'file-video-outline';
    if (mimeType === 'application/pdf') return 'file-pdf-box';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word-outline';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'file-excel-outline';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'zip-box-outline';
    return 'file-outline';
};

const getFileIconColor = (mimeType: string, primary: string): string => {
    if (mimeType.startsWith('image/')) return '#4CAF50';
    if (mimeType.startsWith('video/')) return '#9C27B0';
    if (mimeType === 'application/pdf') return '#F44336';
    if (mimeType.includes('word') || mimeType.includes('document')) return '#2196F3';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '#4CAF50';
    return primary;
};

const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

// ─── Single Attachment Row ────────────────────────────────────────────────────

interface AttachmentRowProps {
    item: Attachment;
    currentUserId?: string;
    onDelete: (id: string) => void;
    baseUrl: string;
}

const AttachmentRow = ({ item, currentUserId, onDelete, baseUrl }: AttachmentRowProps) => {
    const theme = useTheme();
    const isOwner = item.userId === currentUserId;

    const handleOpen = () => {
        // Strip /api/v1 from BASE_URL if present to get the server root
        const serverRoot = baseUrl.replace('/api/v1', '');
        const fullUrl = `${serverRoot}${item.url}`;
        Linking.openURL(fullUrl).catch(() =>
            Toast.show({ type: 'error', text1: 'Could not open file' })
        );
    };

    const handleDeletePress = () => {
        Alert.alert(
            'Delete Attachment',
            `Remove "${item.originalName}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
            ]
        );
    };

    return (
        <TouchableOpacity
            onPress={handleOpen}
            activeOpacity={0.75}
            style={[styles.attachRow, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
        >
            {/* Icon */}
            <View style={[styles.fileIconContainer, { backgroundColor: theme.colors.surface }]}>
                <IconButton
                    icon={getFileIcon(item.mimeType)}
                    size={26}
                    iconColor={getFileIconColor(item.mimeType, theme.colors.primary)}
                    style={{ margin: 0 }}
                />
            </View>

            {/* Info */}
            <View style={styles.attachInfo}>
                <Text
                    numberOfLines={1}
                    style={[styles.attachName, { color: theme.colors.onSurface }]}
                >
                    {item.originalName}
                </Text>
                <Text style={[styles.attachMeta, { color: theme.colors.outline }]}>
                    {formatBytes(item.size)} · {item.user?.name || 'Unknown'} · {formatDate(item.createdAt)}
                </Text>
            </View>

            {/* Actions */}
            <View style={styles.attachActions}>
                <IconButton
                    icon="open-in-new"
                    size={18}
                    iconColor={theme.colors.primary}
                    onPress={handleOpen}
                    style={{ margin: 0 }}
                />
                {isOwner && (
                    <IconButton
                        icon="delete-outline"
                        size={18}
                        iconColor={theme.colors.error}
                        onPress={handleDeletePress}
                        style={{ margin: 0 }}
                    />
                )}
            </View>
        </TouchableOpacity>
    );
};

// ─── Upload Button ────────────────────────────────────────────────────────────

interface UploadButtonProps {
    onPress: () => void;
    isUploading: boolean;
}

const UploadButton = ({ onPress, isUploading }: UploadButtonProps) => {
    const theme = useTheme();
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isUploading}
            activeOpacity={0.75}
            style={[styles.uploadBtn, {
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.primaryContainer + '30',
            }]}
        >
            {isUploading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
                <IconButton icon="paperclip" size={20} iconColor={theme.colors.primary} style={{ margin: 0 }} />
            )}
            <Text style={[styles.uploadBtnText, { color: theme.colors.primary }]}>
                {isUploading ? 'Uploading…' : 'Attach File'}
            </Text>
        </TouchableOpacity>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface AttachmentsSectionProps {
    taskId: string;
    currentUserId?: string;
}

const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({ taskId, currentUserId }) => {
    const theme = useTheme();
    const { token } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();

    const { data: attachments = [], isLoading } = useGetAttachmentsQuery(taskId);
    const [deleteAttachment] = useDeleteAttachmentMutation();
    const [isUploading, setIsUploading] = useState(false);

    const handleDelete = async (attachmentId: string) => {
        try {
            await deleteAttachment({ taskId, attachmentId }).unwrap();
            Toast.show({ type: 'success', text1: 'Attachment deleted' });
        } catch {
            Toast.show({ type: 'error', text1: 'Failed to delete attachment' });
        }
    };

    const doUpload = async (file: { uri: string; name: string; type: string }) => {
        if (!token) return;
        setIsUploading(true);
        try {
            await uploadAttachment(taskId, token, file);
            // Invalidate the cache tag so the list re-fetches
            dispatch(api.util.invalidateTags([{ type: 'Attachment', id: taskId }]));
            Toast.show({ type: 'success', text1: 'File attached!' });
        } catch (err: any) {
            Toast.show({ type: 'error', text1: err.message || 'Upload failed' });
        } finally {
            setIsUploading(false);
        }
    };

    const showPickerOptions = () => {
        Alert.alert('Attach File', 'Choose a source', [
            {
                text: 'Camera',
                onPress: () => launchCamera({ mediaType: 'mixed', quality: 1 }, response => {
                    if (response.assets?.[0]) {
                        const a = response.assets[0];
                        doUpload({ uri: a.uri!, name: a.fileName || 'photo.jpg', type: a.type || 'image/jpeg' });
                    }
                }),
            },
            {
                text: 'Photo Library',
                onPress: () => launchImageLibrary({ mediaType: 'mixed', quality: 1, selectionLimit: 1 }, response => {
                    if (response.assets?.[0]) {
                        const a = response.assets[0];
                        doUpload({ uri: a.uri!, name: a.fileName || 'image.jpg', type: a.type || 'image/jpeg' });
                    }
                }),
            },
            {
                text: 'File',
                onPress: async () => {
                    try {
                        const [result] = await pick({
                            type: ['*/*'],
                        });
                        if (result) {
                            let localUri = result.uri;
                            try {
                                const copyResult = await keepLocalCopy({
                                    files: [{ uri: result.uri, fileName: result.name || 'file' }],
                                    destination: 'cachesDirectory',
                                });
                                if (copyResult[0]?.status === 'success') {
                                    localUri = copyResult[0].localUri;
                                }
                            } catch (copyError) {
                                console.warn('Failed to make a local copy, falling back to original uri', copyError);
                            }
                            doUpload({
                                uri: localUri,
                                name: result.name || 'file',
                                type: result.type || 'application/octet-stream',
                            });
                        }
                    } catch (e) {
                        const isCancel = isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED;
                        if (!isCancel) {
                            Toast.show({ type: 'error', text1: 'Could not open file picker' });
                        }
                    }
                },
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const renderContent = () => {
        if (isLoading) {
            return <ActivityIndicator size="small" style={{ marginVertical: 16 }} />;
        }
        if (attachments.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <IconButton icon="paperclip" size={32} iconColor={theme.colors.outline} />
                    <Text style={[styles.emptyText, { color: theme.colors.outline }]}>
                        No attachments yet.{'\n'}Tap "Attach File" to add one.
                    </Text>
                </View>
            );
        }
        return (
            <View style={styles.attachList}>
                {attachments.map((item) => (
                    <AttachmentRow
                        key={item.id}
                        item={item}
                        currentUserId={currentUserId}
                        onDelete={handleDelete}
                        baseUrl={BASE_URL}
                    />
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header row */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionLabel, { color: theme.colors.outline }]}>
                    ATTACHMENTS {attachments.length > 0 ? `(${attachments.length})` : ''}
                </Text>
                <UploadButton onPress={showPickerOptions} isUploading={isUploading} />
            </View>

            <Divider style={{ marginBottom: 12, opacity: 0.4 }} />

            {renderContent()}
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        paddingTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        gap: 4,
    },
    uploadBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    attachList: {
        gap: 8,
    },
    attachRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        paddingVertical: 8,
        paddingLeft: 8,
        paddingRight: 4,
        gap: 10,
    },
    fileIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachInfo: {
        flex: 1,
    },
    attachName: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 2,
    },
    attachMeta: {
        fontSize: 11,
    },
    attachActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    emptyText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
});

export default AttachmentsSection;
