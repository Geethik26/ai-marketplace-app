import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function PurchasesScreen() {
  const [purchases, setPurchases] = useState<any[]>([]);
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
      fetchPurchases(currentUser.id);
    } else {
      setRefreshing(false);
    }
  }

  const fetchPurchases = async (userId: string) => {
    setRefreshing(true);
    
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        listings (
          id,
          title,
          description,
          price,
          image_url,
          category,
          condition
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading purchases:', error);
    } else {
      setPurchases(data || []);
    }
    setRefreshing(false);
  };

  const onRefresh = async () => {
    if (user) {
      await fetchPurchases(user.id);
    }
  };

  const renderPurchase = ({ item }: { item: any }) => {
    const listing = item.listings;
    if (!listing) return null;

    return (
      <View style={styles.purchaseCard}>
        <Image source={{ uri: listing.image_url }} style={styles.image} />
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
          <Text style={styles.description} numberOfLines={2}>{listing.description}</Text>
          <Text style={styles.price}>${listing.price}</Text>
          <View style={styles.tags}>
            <Text style={styles.category}>{listing.category}</Text>
            <Text style={styles.condition}>{listing.condition}</Text>
          </View>
          <Text style={styles.date}>
            Purchased: {new Date(item.purchased_at || item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={24} color="#00C853" />
          <Text style={styles.statusText}>Purchased</Text>
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.header}>My Purchases</Text>
          <TouchableOpacity onPress={() => router.push('/tabs/login')} style={styles.loginButton}>
            <Ionicons name="log-in-outline" size={20} color="#007AFF" />
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loginPrompt}>
          <Ionicons name="log-in-outline" size={64} color="#ccc" />
          <Text style={styles.loginPromptText}>Please log in to view your purchases</Text>
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
        <Text style={styles.header}>My Purchases</Text>
        <View style={styles.userBox}>
          <Ionicons name="person-circle" size={22} color="#007AFF" />
          <Text style={styles.username} numberOfLines={1}>{user.email}</Text>
          <View style={styles.loggedInDot} />
        </View>
      </View>
      
      {purchases.length === 0 && !refreshing ? (
        <View style={styles.emptyState}>
          <Ionicons name="bag-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No purchases yet</Text>
          <Text style={styles.emptySubtext}>Start shopping to see your purchases here</Text>
          <TouchableOpacity 
            style={styles.shopButton} 
            onPress={() => router.push('/tabs')}
          >
            <Ionicons name="storefront-outline" size={20} color="#fff" />
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => item.id}
          renderItem={renderPurchase}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
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
  purchaseCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  condition: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 10,
    color: '#00C853',
    fontWeight: '600',
    marginTop: 2,
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
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#00C853',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});