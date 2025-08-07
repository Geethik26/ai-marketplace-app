import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Refresh user when screen comes into focus
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
    setUser(data?.user ?? null);
  };

  const passwordIsValid =
    password.length >= 10 &&
    password.length <= 64 &&
    /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]+$/.test(password);

  const handleAuth = async () => {
    setLoading(true);

    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter both email and password');
      setLoading(false);
      return;
    }

    if (!passwordIsValid) {
      Alert.alert(
        'Invalid Password',
        'Password must be 10–64 characters and contain only letters, numbers, and symbols.'
      );
      setLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const result = isLogin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (result.error) {
        Alert.alert('Auth Error', result.error.message);
      } else {
        Alert.alert('Success', isLogin ? 'Logged in!' : 'Account created!');
        setEmail(''); // Clear form
        setPassword('');
        setConfirmPassword('');
        await getUser(); // Refresh user state
        router.push('/tabs');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Unexpected error', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) {
                Alert.alert('Error', 'Failed to logout');
              } else {
                setUser(null);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                Alert.alert('Success', 'Logged out successfully!');
                router.push('/tabs'); // Redirect to home
              }
            } catch (err) {
              console.error('Logout error:', err);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  // If user is logged in, show logged in state
  if (user) {
    return (
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.headerText}>Account</Text>
          <View style={styles.userBox}>
            <Ionicons name="person-circle" size={22} color="#007AFF" />
            <Text style={styles.username} numberOfLines={1}>
              {user.email}
            </Text>
            <View style={styles.loggedInDot} />
          </View>
        </View>

        <View style={styles.loggedInContainer}>
          <View style={styles.welcomeCard}>
            <Ionicons name="checkmark-circle" size={64} color="#00C853" />
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeEmail}>{user.email}</Text>
            <Text style={styles.welcomeMessage}>
              You are successfully logged in to AI Marketplace
            </Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.exploreButton} 
                onPress={() => router.push('/tabs')}
              >
                <Ionicons name="storefront-outline" size={20} color="#fff" />
                <Text style={styles.exploreButtonText}>Explore Marketplace</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.addProductButton} 
                onPress={() => router.push('/tabs/add-product')}
              >
                <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                <Text style={styles.addProductButtonText}>Add Product</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // If user is not logged in, show login form
  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.headerText}>Login</Text>
      </View>

      <Text style={styles.header}>{isLogin ? 'Welcome Back 👋' : 'Create Your Account 📝'}</Text>

      <TextInput
        placeholder="Email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        placeholderTextColor="#999"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
          style={styles.inputPassword}
          placeholderTextColor="#999"
        />
        <Pressable onPress={() => setPasswordVisible(!passwordVisible)}>
          <Ionicons
            name={passwordVisible ? 'eye' : 'eye-off'}
            size={24}
            color="#555"
            style={{ marginRight: 8 }}
          />
        </Pressable>
      </View>

      {!isLogin && (
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!confirmVisible}
            style={styles.inputPassword}
            placeholderTextColor="#999"
          />
          <Pressable onPress={() => setConfirmVisible(!confirmVisible)}>
            <Ionicons
              name={confirmVisible ? 'eye' : 'eye-off'}
              size={24}
              color="#555"
              style={{ marginRight: 8 }}
            />
          </Pressable>
        </View>
      )}

      {!isLogin && (
        <View style={styles.validation}>
          <Text style={{ color: password.length >= 10 ? 'green' : 'red' }}>
            • At least 10 characters
          </Text>
          <Text style={{ color: password.length <= 64 ? 'green' : 'red' }}>
            • Max 64 characters
          </Text>
          <Text style={{ color: passwordIsValid ? 'green' : 'red' }}>
            • Valid symbols (A-Z, a-z, 0–9, !@#$...)
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleAuth}
        style={[styles.button, loading && { backgroundColor: '#ccc' }]}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggle}>
        <Text style={styles.toggleText}>
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 30,
    backgroundColor: '#fefefe',
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
  loggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
    width: '100%',
    maxWidth: 350,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeEmail: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 12,
  },
  welcomeMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  actionButtons: {
    width: '100%',
    gap: 12,
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addProductButton: {
    backgroundColor: '#f0f8ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 8,
  },
  addProductButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  logoutButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#222',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  inputPassword: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  validation: {
    marginBottom: 15,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  toggle: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: '#007AFF',
    fontSize: 15,
  },
});