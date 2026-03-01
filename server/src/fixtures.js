import sharp from 'sharp';
import { ulid } from 'ulid';

export const categories = [
    { name: 'Electronics', color: '#94a3b8', private: false },
    { name: 'Kitchen', color: '#fb923c', private: false },
    { name: 'Books', color: '#60a5fa', private: false },
    { name: 'Office', color: '#4ade80', private: false },
    { name: 'Living Room', color: '#f87171', private: false },
    { name: 'Bedroom', color: '#818cf8', private: false },
    { name: 'Bathroom', color: '#2dd4bf', private: false },
    { name: 'Tools', color: '#a8a29e', private: false },
    { name: 'Hobby', color: '#e879f9', private: false },
    { name: 'Private Stash', color: '#6366f1', private: true }
];

export const subCategories = [
    { name: 'Cameras', parentName: 'Electronics', color: '#64748b', private: false },
    { name: 'Computers', parentName: 'Electronics', color: '#475569', private: false },
    { name: 'Appliances', parentName: 'Kitchen', color: '#d97706', private: false },
    { name: 'Furniture', parentName: 'Living Room', color: '#b91c1c', private: false },
    { name: 'Bedding', parentName: 'Bedroom', color: '#4338ca', private: false },
    { name: 'Secret Documents', parentName: 'Private Stash', color: '#4338ca', private: true }
];

export const items = [
    // Kitchen
    { name: 'Ceramic Plate', categories: ['Kitchen'], quantity: 12, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Glass Bowl', categories: ['Kitchen'], quantity: 6, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Stainless Steel Fork', categories: ['Kitchen'], quantity: 24, usageFrequency: 'daily', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Chef\'s Knife', categories: ['Kitchen'], quantity: 1, usageFrequency: 'daily', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Non-stick Frying Pan', categories: ['Kitchen'], quantity: 2, usageFrequency: 'daily', attachment: 'some', intention: 'maintain', joy: 'medium' },
    { name: 'Electric Kettle', categories: ['Kitchen', 'Appliances'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'high' },
    { name: 'Toaster', categories: ['Kitchen', 'Appliances'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Blender', categories: ['Kitchen', 'Appliances'], quantity: 1, usageFrequency: 'weekly', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Microwave', categories: ['Kitchen', 'Appliances'], quantity: 1, usageFrequency: 'daily', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Coffee Mug', categories: ['Kitchen'], quantity: 10, usageFrequency: 'daily', attachment: 'sentimental', intention: 'keep', joy: 'high' },
    { name: 'Wine Glass', categories: ['Kitchen'], quantity: 8, usageFrequency: 'monthly', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Cutting Board', categories: ['Kitchen'], quantity: 3, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'low' },
    { name: 'Spatula', categories: ['Kitchen'], quantity: 4, usageFrequency: 'daily', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Whisk', categories: ['Kitchen'], quantity: 1, usageFrequency: 'weekly', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Measuring Cups', categories: ['Kitchen'], quantity: 1, usageFrequency: 'weekly', attachment: 'none', intention: 'keep', joy: 'low' },
    
    // Living Room
    { name: 'Velvet Sofa', categories: ['Living Room', 'Furniture'], quantity: 1, usageFrequency: 'daily', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Wooden Coffee Table', categories: ['Living Room', 'Furniture'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Flat Screen TV', categories: ['Living Room', 'Electronics'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Bookshelf', categories: ['Living Room', 'Furniture'], quantity: 2, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Floor Lamp', categories: ['Living Room', 'Furniture'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Throw Pillow', categories: ['Living Room'], quantity: 4, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Wool Rug', categories: ['Living Room'], quantity: 1, usageFrequency: 'daily', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Remote Control', categories: ['Living Room', 'Electronics'], quantity: 3, usageFrequency: 'daily', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Picture Frame', categories: ['Living Room'], quantity: 5, usageFrequency: 'daily', attachment: 'sentimental', intention: 'keep', joy: 'high' },
    { name: 'Monstera Plant', categories: ['Living Room'], quantity: 1, usageFrequency: 'daily', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Bluetooth Speaker', categories: ['Living Room', 'Electronics'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'high' },
    
    // Bedroom
    { name: 'Queen Mattress', categories: ['Bedroom', 'Furniture'], quantity: 1, usageFrequency: 'daily', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Down Duvet', categories: ['Bedroom', 'Bedding'], quantity: 1, usageFrequency: 'daily', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Silk Pillowcase', categories: ['Bedroom', 'Bedding'], quantity: 2, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'high' },
    { name: 'Nightstand', categories: ['Bedroom', 'Furniture'], quantity: 2, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Wardrobe', categories: ['Bedroom', 'Furniture'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Bedside Lamp', categories: ['Bedroom', 'Furniture'], quantity: 2, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Alarm Clock', categories: ['Bedroom', 'Electronics'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'low' },
    { name: 'Full Mirror', categories: ['Bedroom', 'Furniture'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    
    // Bathroom
    { name: 'Cotton Towel', categories: ['Bathroom'], quantity: 8, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Soap Dispenser', categories: ['Bathroom'], quantity: 1, usageFrequency: 'daily', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Toothbrush Holder', categories: ['Bathroom'], quantity: 1, usageFrequency: 'daily', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Bath Mat', categories: ['Bathroom'], quantity: 2, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Shower Curtain', categories: ['Bathroom'], quantity: 1, usageFrequency: 'daily', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Hair Dryer', categories: ['Bathroom', 'Electronics'], quantity: 1, usageFrequency: 'weekly', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Electric Toothbrush', categories: ['Bathroom', 'Electronics'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'high' },
    { name: 'Scale', categories: ['Bathroom', 'Electronics'], quantity: 1, usageFrequency: 'weekly', attachment: 'none', intention: 'keep', joy: 'low' },
    
    // Office
    { name: 'Ergonomic Chair', categories: ['Office', 'Furniture'], quantity: 1, usageFrequency: 'daily', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Writing Desk', categories: ['Office', 'Furniture'], quantity: 1, usageFrequency: 'daily', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Desktop Monitor', categories: ['Office', 'Electronics'], quantity: 2, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'high' },
    { name: 'Wireless Mouse', categories: ['Office', 'Electronics', 'Computers'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Mechanical Keyboard', categories: ['Office', 'Electronics', 'Computers'], quantity: 1, usageFrequency: 'daily', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Laptop Stand', categories: ['Office', 'Furniture'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Notebook', categories: ['Office'], quantity: 3, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Ballpoint Pen', categories: ['Office'], quantity: 12, usageFrequency: 'daily', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'File Organizer', categories: ['Office'], quantity: 2, usageFrequency: 'weekly', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Desk Lamp', categories: ['Office', 'Furniture'], quantity: 1, usageFrequency: 'daily', attachment: 'some', intention: 'keep', joy: 'medium' },
    
    // Tools
    { name: 'Claw Hammer', categories: ['Tools'], quantity: 1, usageFrequency: 'monthly', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Screwdriver Set', categories: ['Tools'], quantity: 1, usageFrequency: 'monthly', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Power Drill', categories: ['Tools', 'Electronics'], quantity: 1, usageFrequency: 'yearly', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Tape Measure', categories: ['Tools'], quantity: 1, usageFrequency: 'monthly', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Adjustable Wrench', categories: ['Tools'], quantity: 1, usageFrequency: 'yearly', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Level', categories: ['Tools'], quantity: 1, usageFrequency: 'yearly', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Utility Knife', categories: ['Tools'], quantity: 2, usageFrequency: 'monthly', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Toolbox', categories: ['Tools'], quantity: 1, usageFrequency: 'monthly', attachment: 'some', intention: 'keep', joy: 'medium' },
    
    // Hobby
    { name: 'Acoustic Guitar', categories: ['Hobby'], quantity: 1, usageFrequency: 'weekly', attachment: 'sentimental', intention: 'keep', joy: 'high' },
    { name: 'Yoga Mat', categories: ['Hobby'], quantity: 1, usageFrequency: 'weekly', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Dumbbells', categories: ['Hobby'], quantity: 2, usageFrequency: 'weekly', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Board Game (Catan)', categories: ['Hobby'], quantity: 1, usageFrequency: 'monthly', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Deck of Cards', categories: ['Hobby'], quantity: 2, usageFrequency: 'monthly', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Backpack', categories: ['Hobby'], quantity: 1, usageFrequency: 'daily', attachment: 'strong', intention: 'keep', joy: 'high' },
    { name: 'Umbrella', categories: ['Hobby'], quantity: 2, usageFrequency: 'monthly', attachment: 'none', intention: 'keep', joy: 'low' },
    { name: 'Flashlight', categories: ['Hobby'], quantity: 1, usageFrequency: 'yearly', attachment: 'some', intention: 'keep', joy: 'medium' },
    
    // Electronics
    { name: 'Vintage Camera', categories: ['Electronics', 'Cameras'], quantity: 1, usageFrequency: 'monthly', attachment: 'sentimental', intention: 'keep', joy: 'high', loan: { borrower: 'John Doe', note: 'Wants to take some artistic photos' } },
    
    // Private Stash
    { name: 'Personal Diary', categories: ['Private Stash'], quantity: 1, usageFrequency: 'weekly', attachment: 'sentimental', intention: 'keep', joy: 'high' },
    { name: 'Secret Folder', categories: ['Secret Documents'], quantity: 1, usageFrequency: 'unused', attachment: 'some', intention: 'keep', joy: 'low' },
    { name: 'Old Passport', categories: ['Private Stash'], quantity: 1, usageFrequency: 'yearly', attachment: 'sentimental', intention: 'keep', joy: 'medium' },
    { name: 'Crypto Recovery Seed', categories: ['Secret Documents'], quantity: 1, usageFrequency: 'unused', attachment: 'strong', intention: 'keep', joy: 'low' },
    { name: 'Spare Keys', categories: ['Private Stash'], quantity: 5, usageFrequency: 'unused', attachment: 'some', intention: 'keep', joy: 'low' },
    { name: 'Emergency Cash', categories: ['Private Stash'], quantity: 1, usageFrequency: 'unused', attachment: 'some', intention: 'keep', joy: 'medium' },
    { name: 'Tax Documents 2023', categories: ['Secret Documents'], quantity: 1, usageFrequency: 'yearly', attachment: 'some', intention: 'keep', joy: 'low' }
];

export const artisticQuestions = [
    {
        question: 'Why do we own stuff?',
        answer: 'Ownership is often a way to extend our identity into the physical world. We surround ourselves with things that reflect who we are, or who we want to be. But it can also become a burden, a set of anchors that keep us from moving freely.'
    },
    {
        question: 'What does it mean to "own" something?',
        answer: 'Is it just a legal title? Or is it the relationship we have with the object? True ownership might be about the care we give to something. If we don\'t use it or care for it, do we really own it, or is it just occupying space in our lives?'
    }
];

export async function generatePlaceholderImage(name) {
    const colors = [
        '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', 
        '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'
    ];
    
    // Pick a color based on the name hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    const svg = `
    <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="${color}" />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="150" fill="white" font-weight="bold">${initials}</text>
    </svg>
    `;
    
    const imageBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();
        
    const thumbnailBuffer = await sharp(imageBuffer)
        .resize(100, 100)
        .png()
        .toBuffer();
        
    return {
        imageBlob: imageBuffer,
        thumbnailBlob: thumbnailBuffer,
        imageMime: 'image/png',
        thumbMime: 'image/png',
        imageWidth: 400,
        imageHeight: 400,
        thumbWidth: 100,
        thumbHeight: 100
    };
}
