import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ListedProducts() {
  const [listings, setListings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [soldItems, setSoldItems] = useState<Set<string>>(new Set()); // Track sold items
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

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user;
    setUser(currentUser);
    
    if (currentUser) {
      fetchUserListings(currentUser.id);
    }
  };

  const fetchUserListings = async (userId: string) => {
    setRefreshing(true);
    
    // Fetch ALL user listings including sold ones
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching listings:', error);
    } else {
      console.log('Fetched listings:', data);
      setListings(data || []);
      
      // Check which items are sold by looking at purchases
      await checkSoldItems(data || []);
    }
    setRefreshing(false);
  };

  // Check which items have been purchased
  const checkSoldItems = async (listingsData: any[]) => {
    const listingIds = listingsData.map(item => item.id);
    
    if (listingIds.length === 0) return;
    
    const { data: purchases } = await supabase
      .from('purchases')
      .select('listing_id')
      .in('listing_id', listingIds);
    
    const soldIds = new Set(purchases?.map(p => p.listing_id) || []);
    setSoldItems(soldIds);
  };

  const onRefresh = async () => {
    if (user) {
      await fetchUserListings(user.id);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    console.log('Attempting to delete item with id:', id);
    
    // Check if item is sold
    if (soldItems.has(id)) {
      Alert.alert('Cannot Delete', 'You cannot delete items that have been sold.');
      return;
    }

    // Double-check by looking for purchases of this item
    const { data: purchases, error: purchaseError } = await supabase
      .from('purchases')
      .select('id')
      .eq('listing_id', id)
      .limit(1);

    if (purchaseError) {
      console.error('Error checking purchases:', purchaseError);
      Alert.alert('Error', 'Could not verify item status');
      return;
    }

    if (purchases && purchases.length > 0) {
      Alert.alert('Cannot Delete', 'This item has been purchased and cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('listings').delete().eq('id', id);
            if (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Could not delete listing');
            } else {
              setListings((prev) => prev.filter((item) => item.id !== id));
              Alert.alert('Success', 'Item deleted successfully');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (item: any) => {
    const isSold = soldItems.has(item.id) || item.status === 'sold';
    return isSold ? '#ff6b6b' : '#51cf66';
  };

  const getStatusText = (item: any) => {
    const isSold = soldItems.has(item.id) || item.status === 'sold';
    return isSold ? 'SOLD' : 'AVAILABLE';
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSold = soldItems.has(item.id) || item.status === 'sold';

    return (
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image_url }} style={styles.image} />
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
            <Text style={styles.statusText}>{getStatusText(item)}</Text>
          </View>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.price}>${item.price}</Text>
            <View style={styles.tags}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.condition}>{item.condition}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.date}>
              Listed: {new Date(item.created_at).toLocaleDateString()}
            </Text>
            {isSold && item.sold_at && (
              <Text style={styles.soldDate}>
                Sold: {new Date(item.sold_at).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Show delete button only for available items */}
          {!isSold && (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => handleDelete(item.id, item.title)}
            >
              <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
          
          {/* Show sold message for sold items */}
          {isSold && (
            <View style={styles.soldIndicator}>
              <Ionicons name="checkmark-circle" size={18} color="#00C853" />
              <Text style={styles.soldText}>Item Sold Successfully</Text>
            </View>
          )}

          {/* Show buyer info if sold */}
          {isSold && item.sold_to && (
            <View style={styles.buyerInfo}>
              <Ionicons name="person" size={16} color="#666" />
              <Text style={styles.buyerText}>Sold to customer</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.headerText}>Your Listings</Text>
          <TouchableOpacity onPress={() => router.push('/tabs/login')} style={styles.loginButton}>
            <Ionicons name="log-in-outline" size={20} color="#007AFF" />
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loginPrompt}>
          <Ionicons name="log-in-outline" size={64} color="#ccc" />
          <Text style={styles.loginPromptText}>Please log in to view your listings</Text>
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
        <Text style={styles.headerText}>Your Listings</Text>
        <View style={styles.userBox}>
          <Ionicons name="person-circle" size={22} color="#007AFF" />
          <Text style={styles.username} numberOfLines={1}>{user.email}</Text>
          <View style={styles.loggedInDot} />
        </View>
      </View>

      {listings.length === 0 && !refreshing ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No items listed yet</Text>
          <Text style={styles.emptySubtext}>Add your first product to get started</Text>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => router.push('/tabs/add-product')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

// ... rest of styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: '#fefefe',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  headerText: {
    fontSize: 22,
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
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
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
  footer: {
    marginBottom: 12,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  soldDate: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#ffe0e0',
  },
  deleteText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  soldIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#e8f5e8',
    marginBottom: 8,
  },
  soldText: {
    color: '#00C853',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  buyerText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
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
  addButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});