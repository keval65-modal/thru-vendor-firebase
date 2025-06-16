
'use server';

// This is a mock authentication system.
// In a real application, use a secure authentication library like NextAuth.js.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';
const MOCK_USER_EMAIL = 'vendor@example.com';
const MOCK_PASSWORD = 'password123'; // This would be hashed in a real app

// MOCK DATABASE for users - In a real app, this would be a proper database.
const mockUsers: Array<Record<string, any>> = [
  { email: MOCK_USER_EMAIL, password: MOCK_PASSWORD, name: "Test Vendor" }
  // Registered users would be added here by the signup process
];

export async function login(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Simulate database check
  const user = mockUsers.find(u => u.email === email);

  // IMPORTANT: Never store/compare plain text passwords in production!
  // This is a mock. In a real app, you would hash the input password
  // and compare it against a stored hashed password.
  if (user && user.password === password) { 
    cookies().set(AUTH_COOKIE_NAME, email, { // Store email as token for simplicity
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return { success: true };
  } else {
    return { success: false, error: 'Invalid email or password.' };
  }
}

export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

export async function getSession(): Promise<{ isAuthenticated: boolean; email?: string; name?: string } | null> {
  const tokenEmail = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (tokenEmail) {
    // In a real app, you'd validate the token and fetch user details from DB
    const user = mockUsers.find(u => u.email === tokenEmail);
    if (user) {
      return { isAuthenticated: true, email: user.email, name: user.name };
    }
  }
  return { isAuthenticated: false };
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session?.isAuthenticated || false;
}

// New function to handle vendor registration (mocked)
export async function registerNewVendor(vendorData: any): Promise<{ success: boolean; error?: string; userId?: string }> {
  // In a real application, this function would:
  // 1. Hash the password securely (e.g., using bcrypt or argon2).
  // 2. Check if the email already exists in the database.
  // 3. Save the new vendor to the database (storing the HASHED password).
  // 4. Handle shop image upload to a storage service.

  const existingUser = mockUsers.find(u => u.email === vendorData.email);
  if (existingUser) {
    return { success: false, error: 'An account with this email already exists.' };
  }
  
  // **SECURITY WARNING**: Storing plain text passwords is a major security risk.
  // In a real application, `vendorData.password` MUST be hashed here before saving.
  // Example (conceptual, actual hashing library needed):
  // const hashedPassword = await hashPassword(vendorData.password);
  const newUser = {
    ...vendorData, // Includes all form fields like shopName, ownerName, etc.
    password: vendorData.password, // Storing plain password for MOCK ONLY
    // shopImageUrl: null, // This would be set after image upload
  };
  // Remove confirmPassword if it was passed along, it's not needed for storage
  delete newUser.confirmPassword; 
  
  mockUsers.push(newUser);
  
  console.log("Mock User DB Updated with new user:", newUser);
  console.log("Current Mock User DB:", mockUsers);


  // Simulate successful registration
  return { success: true, userId: vendorData.email }; // Using email as mock ID
}

