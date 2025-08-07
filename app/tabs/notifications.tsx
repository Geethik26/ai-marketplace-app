import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      getUser();
    }, [])
  );

  useEffect(() => {
    getUser();
  }, []);

  async function getUser() {
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user ?? null;
    setUser(currentUser);
    
    if (currentUser) {
      fetchNotifications(currentUser.id);
    } else {
      setRefreshing(false);
    }
  }

  const fetchNotifications = async (userId: string) => {
    setRefreshing(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading notifications:', error);
    } else {
      setNotifications(data || []);
    }
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id);
    
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const renderNotification = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.notificationCard, item.read && styles.readCard]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={item.type === 'purchase' ? 'bag' : 'notifications'} 
          size={20} 
          color={item.read ? '#999' : '#007AFF'} 
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.message, item.read && styles.readText]}>
          {item.message}
        </Text>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.header}>Notifications</Text>
          <TouchableOpacity onPress={() => router.push('/tabs/login')} style={styles.loginButton}>
            <Ionicons name="log-in-outline" size={20} color="#007AFF" />
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loginPrompt}>
          <Ionicons name="log-in-outline" size={64} color="#ccc" />
          <Text style={styles.loginPromptText}>Please log in to view notifications</Text>
          <TouchableOpacity 
            style={styles.loginPromptButton} 
            onPress={() => router.push('/tabs/login')}
          >
            <Text style={styles.loginPromptButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.rightContainer}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <View style={styles.userBox}>
            <Ionicons name="person-circle" size={22} color="#007AFF" />
            <Text style={styles.username} numberOfLines={1}>{user.email}</Text>
            <View style={styles.loggedInDot} />
          </View>
        </View>
      </View>
      
      {notifications.length === 0 && !refreshing ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>You'll see purchase notifications here</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => user && fetchNotifications(user.id)} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefefe',
    paddingTop: 60,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
  },
  badge: {
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  markAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  userBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eaf4ff',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: 'relative',
  },
  username: {
    marginLeft: 4,
    fontSize: 13,
    color: '#007AFF',
    maxWidth: 100,
  },
  loggedInDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00C853',
    marginLeft: 6,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  loginText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  readCard: {
    backgroundColor: '#f8f8f8',
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: '#222',
    marginBottom: 4,
  },
  readText: {
    color: '#666',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    alignSelf: 'center',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginPromptText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  loginPromptButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginPromptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});