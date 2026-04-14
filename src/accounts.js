import { 
  db, auth, createUserWithEmailAndPassword, identifyUserRole,
  collection, addDoc, getDocs, query, orderBy, serverTimestamp 
} from './firebase.js';

const ACCOUNTS_COLLECTION = 'test_accounts';

document.addEventListener('DOMContentLoaded', () => {
  setupForm();
  loadAccounts();
});

function setupForm() {
  const form = document.getElementById('account-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = form.querySelector('button');

    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = 'Creating...';

      // 1. Create in Firebase Auth
      // Note: This automatically signs in the new user in the current session
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Save to Firestore for the table
      const role = identifyUserRole(email);
      await addDoc(collection(db, ACCOUNTS_COLLECTION), {
        email: email,
        password: password, // Storing for convenience in test tool, usually a bad idea
        role: role,
        uid: user.uid,
        createdAt: serverTimestamp()
      });

      alert(`Account created successfully! Role: ${role.toUpperCase()}.\n\nNOTE: You are now signed in as ${email}.`);
      form.reset();
      loadAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
      alert(`Error: ${error.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}

async function loadAccounts() {
  const tableBody = document.getElementById('accounts-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="4">Loading accounts...</td></tr>';

  try {
    const q = query(collection(db, ACCOUNTS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="4">No test accounts found. Create one above!</td></tr>';
      return;
    }

    tableBody.innerHTML = '';
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${data.email}</td>
        <td><code>${data.password}</code></td>
        <td><span class="role-badge ${data.role}">${data.role.toUpperCase()}</span></td>
        <td>${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error loading accounts:', error);
    tableBody.innerHTML = '<tr><td colspan="4">Error loading accounts. Check console.</td></tr>';
  }
}
