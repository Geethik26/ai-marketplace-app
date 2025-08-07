import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const [listings, setListings] = useState<any[]>([]);
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Refresh user and listings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      getUser();
      fetchListings();
    }, [])
  );

  useEffect(() => {
    getUser();
    fetchListings();
  }, []);

  async function getUser() {
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      const { data: purchases } = await supabase
        .from('purchases')
        .select('listing_id')
        .eq('user_id', currentUser.id);

      const ids = new Set(purchases?.map((p) => p.listing_id));
      setPurchasedIds(ids);
    } else {
      setPurchasedIds(new Set());
    }
  }

  const fetchListings = async () => {
    setRefreshing(true);
    
    // Only fetch listings that are available (NOT sold) AND exclude null status for backward compatibility
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .or('status.is.null,status.eq.available') // Only available or null status items
      .order('created_at', { ascending: false });
        
    if (error) {
      console.error('Error loading listings:', error);
      return;
    }
    setListings(data || []);
    groupByCategory(data || []);
    setRefreshing(false);
  };

  const onRefresh = async () => {
    await getUser(); // Refresh user state too
    await fetchListings();
  };

  const groupByCategory = (items: any[]) => {
    const groupedData = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, any[]>);
    setGrouped(groupedData);
  };

  const handleAddProduct = async () => {
    if (!user) {
      router.push('/tabs/login');
    } else {
      router.push('/tabs/add-product');
    }
  };

  const handleBuy = async (listingId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to buy products.');
      router.push('/tabs/login');
      return;
    }

    try {
      // 1. Record the purchase
      const { error: purchaseError } = await supabase.from('purchases').insert({
        user_id: user.id,
        listing_id: listingId,
        purchased_at: new Date().toISOString(),
      });

      if (purchaseError) {
        Alert.alert('Error', 'Failed to complete purchase.');
        return;
      }

      // 2. Mark the listing as sold with timestamp
      const { error: updateError } = await supabase
        .from('listings')
        .update({ 
          status: 'sold', 
          sold_to: user.id,
          sold_at: new Date().toISOString()
        })
        .eq('id', listingId);

      if (updateError) {
        console.error('Error updating listing status:', updateError);
      }

      // 3. Get listing details for notification
      const { data: listing } = await supabase
        .from('listings')
        .select('title, user_id')
        .eq('id', listingId)
        .single();

      // 4. Create notification for the seller
      if (listing && listing.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: listing.user_id,
          message: `Your item "${listing.title}" has been purchased by ${user.email}!`,
          type: 'purchase',
          created_at: new Date().toISOString(),
        });
      }

      Alert.alert('Success', 'Purchase completed! The item has been removed from the marketplace.');
      setPurchasedIds((prev) => new Set(prev).add(listingId));
      
      // 5. Refresh both user state and listings immediately
      await getUser();
      await fetchListings();
      
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Something went wrong with your purchase.');
    }
  };

  const renderProduct = (item: any) => {
    const isPurchased = purchasedIds.has(item.id);
    const isOwner = user && user.id === item.user_id;

    return (
      <View style={styles.productCard}>
        <Image source={{ uri: item.image_url }} style={styles.image} />
        <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.price}>${item.price}</Text>

        {isOwner ? (
          <Text style={styles.ownerTag}>Your Item</Text>
        ) : isPurchased ? (
          <Text style={styles.purchasedTag}>✅ Purchased</Text>
        ) : (
          <TouchableOpacity style={styles.buyButton} onPress={() => handleBuy(item.id)}>
            <Text style={styles.buyButtonText}>Buy</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSkeletons = () => (
    <View style={styles.skeletonContainer}>
      {[...Array(3)].map((_, i) => (
        <MotiView
          key={i}
          from={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ loop: true, type: 'timing', duration: 1000 }}
          style={styles.skeletonCard}
        />
      ))}
    </View>
  );

  // Filter listings based on search
  const filteredGrouped = search 
    ? Object.keys(grouped).reduce((acc, category) => {
        const filtered = grouped[category].filter(item => 
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[category] = filtered;
        }
        return acc;
      }, {} as Record<string, any[]>)
    : grouped;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.headerText}>🛍️ AI Market</Text>
        {user ? (
          <View style={styles.userBox}>
            <Ionicons name="person-circle" size={22} color="#007AFF" />
            <Text style={styles.username} numberOfLines={1}>{user.email}</Text>
            <View style={styles.loggedInDot} />
          </View>
        ) : (
          <TouchableOpacity onPress={() => router.push('/tabs/login')} style={styles.loginButton}>
            <Ionicons name="log-in-outline" size={20} color="#007AFF" />
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          placeholder="Search products"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Product</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {refreshing ? (
          renderSkeletons()
        ) : listings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No products available</Text>
          </View>
        ) : Object.keys(filteredGrouped).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        ) : (
          Object.keys(filteredGrouped).map((category) => (
            <View key={category} style={styles.categoryBlock}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <FlatList
                horizontal
                data={filteredGrouped[category]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderProduct(item)}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fefefe',
    flex: 1,
    paddingTop: 60,
  },
  topBar: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
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
  searchBox: {
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
    padding: 10,
    paddingLeft: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    marginLeft: 10,
    fontSize: 16,
    flex: 1,
  },
  addButton: {
    marginTop: 14,
    marginHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollContainer: {
    paddingBottom: 80,
  },
  categoryBlock: {
    marginTop: 30,
    paddingLeft: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  productCard: {
    backgroundColor: '#fff',
    marginRight: 14,
    width: 140,
    borderRadius: 12,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  image: {
    height: 100,
    width: '100%',
    borderRadius: 8,
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  price: {
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 4,
    color: '#007AFF',
  },
  buyButton: {
    marginTop: 8,
    backgroundColor: '#00C853',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  purchasedTag: {
    marginTop: 8,
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: '#e0f0e0',
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
  },
  ownerTag: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
  },
  skeletonContainer: {
    flexDirection: 'row',
    paddingLeft: 20,
    paddingTop: 20,
    gap: 12,
  },
  skeletonCard: {
    width: 140,
    height: 180,
    backgroundColor: '#eee',
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
});