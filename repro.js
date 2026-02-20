
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, baseURL: 'http://localhost:3000' }));

async function run() {
    try {
        console.log('1. Login...');
        const loginRes = await client.post('/api/auth/login', {
            username: 'admin',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Token received:', token);

        client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        console.log('2. Creating a public item...');
        await client.post('/api/items', {
            name: 'Public Item',
            quantity: 10
        });

        console.log('3. Creating an item in a private category...');
        const privateCatRes = await client.post('/api/categories', {
            name: 'Private Category',
            private: true
        });
        const privateCatId = privateCatRes.data.id;
        console.log('Private category created:', privateCatId);

        await client.post('/api/items', {
            name: 'Item in Private Category',
            quantity: 3,
            categoryIds: [privateCatId]
        });

        console.log('3b. Creating a public category...');
        const publicCatRes = await client.post('/api/categories', {
            name: 'Public Category',
            private: false
        });
        const publicCatId = publicCatRes.data.id;
        console.log('Public category created:', publicCatId);

        console.log('3c. Creating an item in a public category...');
        await client.post('/api/items', {
            name: 'Item in Public Category',
            quantity: 2,
            categoryIds: [publicCatId]
        });

        console.log('4. Fetching items and categories (expecting private ones to be hidden)...');
        const itemsRes = await client.get('/api/items');
        const items = itemsRes.data;
        console.log('Items found:', items.length);
        items.forEach(item => console.log(`- ${item.name} (private: ${item.private}, categories: ${item.categoryIds?.join(', ')})`));

        const categoriesRes = await client.get('/api/categories');
        const categories = categoriesRes.data;
        console.log('Categories found:', categories.length);
        categories.forEach(cat => console.log(`- ${cat.name} (private: ${cat.private || cat.isPrivate})`));

        const itemInPrivateCat = items.find(i => i.name === 'Item in Private Category');
        const privateCat = categories.find(c => c.name === 'Private Category');

        if (itemInPrivateCat || privateCat) {
            console.log('BUG: Private item or category is visible without unlock!');
        } else {
            console.log('SUCCESS: Private items and categories are hidden.');
        }

        console.log('5. Unlocking private items...');
        await client.post('/api/auth/unlock-private', {
            password: 'password123'
        });

        console.log('6. Fetching items and categories again (expecting both)...');
        const itemsResUnlocked = await client.get('/api/items');
        const itemsUnlocked = itemsResUnlocked.data;
        console.log('Items found:', itemsUnlocked.length);
        itemsUnlocked.forEach(item => console.log(`- ${item.name} (private: ${item.private})`));

        const categoriesResUnlocked = await client.get('/api/categories');
        const categoriesUnlocked = categoriesResUnlocked.data;
        console.log('Categories found:', categoriesUnlocked.length);
        categoriesUnlocked.forEach(cat => console.log(`- ${cat.name} (private: ${cat.private || cat.isPrivate})`));

        const itemInPrivateCatUnlocked = itemsUnlocked.find(i => i.name === 'Item in Private Category');
        const privateCatUnlocked = categoriesUnlocked.find(c => c.name === 'Private Category');
        if (itemInPrivateCatUnlocked && privateCatUnlocked) {
            console.log('SUCCESS: Private items and categories are visible after unlock.');
        } else {
            console.log('FAILURE: Private items or categories are still hidden after unlock.');
        }

    } catch (err) {
        console.error('Error during reproduction:', err.response?.data || err.message);
    }
}

run();
