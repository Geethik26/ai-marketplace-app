import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import loadingAnimation from '../../assets/loading.json';
import { supabase } from '../../lib/supabase';

export default function AddProduct() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryValue, setCategoryValue] = useState(null);
  const [categoryItems, setCategoryItems] = useState([
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Video Games & Consoles', value: 'Video Games & Consoles' },
    { label: 'Home Appliances', value: 'Home Appliances' },
    { label: 'Fashion', value: 'Fashion' },
    { label: 'Health & Beauty', value: 'Health & Beauty' },
    { label: 'Sports', value: 'Sports' },
  ]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Reset state on screen focus
  useFocusEffect(
    useCallback(() => {
      setImageUri(null);
      setUploadedImageUrl(null);
      setAiData(null);
      setCategoryValue(null);
      setZoomVisible(false);
      setLoading(false);
      getUser(); // Refresh user on focus
    }, [])
  );

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data?.user ?? null);
  };

  const pickImage = async () => {
    // Check if user is logged in first
    if (!user) {
      Alert.alert('Login Required', 'Please log in to add products.');
      router.push('/tabs/login');
      return;
    }

    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Permission required to access media library');
        return;
      }

      // Use the corrected syntax for mediaTypes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', // Fixed: Use string instead of ImagePicker.MediaType.Images
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setImageUri(selectedUri);
        setAiData(null);
        setUploadedImageUrl(null);
        uploadImageToSupabase(selectedUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImageToSupabase = async (uri: string) => {
    try {
      setLoading(true);
      
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create file info
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const fileType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

      // Convert base64 to ArrayBuffer for upload
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, byteArray, {
          contentType: fileType,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError || !uploadData) {
        console.error('Upload error:', uploadError);
        Alert.alert('Upload Failed', 'Failed to upload image to storage. Please try again.');
        setLoading(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(uploadData.path);

      if (!publicUrl) {
        Alert.alert('Error', 'Failed to get image URL');
        setLoading(false);
        return;
      }

      console.log('Image uploaded successfully:', publicUrl);
      setUploadedImageUrl(publicUrl);
      
      // Send to AI for analysis
      await sendToGemini(base64);
      
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
      setLoading(false);
    }
  };

// ...existing code...

const sendToGemini = async (base64: string) => {
  try {
    console.log('Sending to AI for analysis...');
    
    const res = await fetch(
      'https://us-central1-ai-marketplace-f9edc.cloudfunctions.net/generateListing',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      }
    );

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log('AI Response:', data);

    // ✅ IMPROVED VALIDATION
    if (data?.title && 
        data?.description && 
        data?.price !== null && 
        data?.price !== undefined && 
        typeof data.price === 'number' && 
        data?.category && 
        data?.condition) {
      setAiData(data);
      setCategoryValue(data.category);
      console.log('AI analysis completed successfully');
    } else {
      console.error('Invalid AI response:', data);
      Alert.alert('AI Error', 'Invalid AI response. Please try again.');
    }
  } catch (err) {
    console.error('Gemini error:', err);
    Alert.alert('AI Error', 'Failed to analyze image. Please try again.');
  } finally {
    setLoading(false);
  }
};

// ...existing code...

  const handleListProduct = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to list a product.');
      return;
    }

    if (!uploadedImageUrl || !aiData) {
      Alert.alert('Error', 'Please wait for image upload and AI analysis to complete.');
      return;
    }

    if (!categoryValue) {
      Alert.alert('Error', 'Please select a category.');
      return;
    }

    try {
      console.log('Listing product...');
      
      const { error } = await supabase.from('listings').insert({
        image_url: uploadedImageUrl,
        title: aiData.title,
        description: aiData.description,
        price: parseFloat(aiData.price),
        category: categoryValue,
        condition: aiData.condition,
        user_id: user.id,
        status: 'available',
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Database error:', error);
        Alert.alert('Upload Failed', error.message);
      } else {
        console.log('Product listed successfully');
        Alert.alert('Success', 'Product listed successfully!', [
          { text: 'OK', onPress: () => router.push('/tabs/listed') }
        ]);
      }
    } catch (err) {
      console.error('Listing error:', err);
      Alert.alert('Error', 'Failed to list product');
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, isDark && { backgroundColor: '#000' }]}>
      {/* Top Bar with User Info */}
      <View style={styles.topBar}>
        <Text style={[styles.headerText, isDark && { color: '#fff' }]}>Add Product</Text>
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

      <TouchableOpacity onPress={pickImage} style={styles.uploadBox} disabled={loading}>
        {imageUri ? (
          <TouchableOpacity onPress={() => setZoomVisible(true)} disabled={loading}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            {loading && (
              <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="cloud-upload-outline" size={40} color="#aaa" />
            <Text style={styles.placeholderText}>Tap to upload image</Text>
          </View>
        )}
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingContainer}>
          <LottieView
            source={loadingAnimation}
            autoPlay
            loop
            style={{ width: 120, height: 120, alignSelf: 'center' }}
          />
          <Text style={styles.loadingMessage}>Analyzing image with AI...</Text>
        </View>
      )}

      {aiData && !loading && uploadedImageUrl && (
        <View style={styles.card}>
          <Text style={styles.label}>Title:</Text>
          <Text style={styles.value}>{aiData.title}</Text>
          
          <Text style={styles.label}>Description:</Text>
          <Text style={styles.value}>{aiData.description}</Text>
          
          <Text style={styles.label}>Price:</Text>
          <Text style={styles.value}>${aiData.price}</Text>
          
          <Text style={styles.label}>Condition:</Text>
          <Text style={styles.value}>{aiData.condition}</Text>

          <Text style={styles.label}>Category:</Text>
          <View style={{ zIndex: 1000 }}>
            <DropDownPicker
              open={categoryOpen}
              value={categoryValue}
              items={categoryItems}
              setOpen={setCategoryOpen}
              setValue={setCategoryValue}
              setItems={setCategoryItems}
              placeholder="Select category"
              style={{ marginBottom: 16 }}
              dropDownContainerStyle={{ zIndex: 1000, elevation: 1000 }}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleListProduct}>
            <Text style={styles.buttonText}>✅ List Product</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={zoomVisible} transparent animationType="fade">
        <View style={styles.zoomOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setZoomVisible(false)}>
            <Image source={{ uri: imageUri ?? '' }} style={styles.zoomImage} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 26,
    fontWeight: '700',
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
  uploadBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f4f4f4',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingMessage: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    color: '#444',
  },
  value: {
    fontSize: 16,
    color: '#222',
    marginBottom: 8,
  },
  button: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: '100%',
    height: '100%',
  },
});