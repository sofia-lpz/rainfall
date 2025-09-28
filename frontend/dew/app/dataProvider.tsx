// This file provides data for the application
import { indexedSite } from './interfaces';

const server = 'http://localhost:3000';
const server2 = "http://localhost:3001";


export const getIndexedSites = async (): Promise<indexedSite[]> => {
    // endpoint /alladdresses

    try {
        const response = await fetch(`${server2}/returnAllAddresses`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Transform the API response to match indexedSite interface
        if (data.success && data.addresses && Array.isArray(data.addresses)) {
            return data.addresses.map((item: { address: string; title: string }) => ({
                title: item.title,
                description: '', // API doesn't provide description, using empty string
                address: item.address,
                ispublic: true // API doesn't provide ispublic flag, defaulting to true
            }));
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching indexed sites:', error);
        return [];
    }
};

export const getSiteContent = async (address: string): Promise<{ success: boolean; message: string }> => {
    //return { success: true, html: "<!DOCTYPE html><html lang=en><head><meta charset=UTF-8><meta name=viewport content='width=device-width, initial-scale=1.0'><title>All About Cats</title><style>body {font-family:Arial,sans-serif;line-height:1.6;margin:0;padding:20px;background-color:#f4f4f4;color:#333}.container {max-width:800px;margin:0 auto;background-color:white;padding:30px;border-radius:10px;box-shadow:0 0 10px rgba(0,0,0,0.1)}h1 {color:#2c3e50;text-align:center;border-bottom:3px solid #e74c3c;padding-bottom:10px}h2 {color:#34495e;margin-top:25px}.fun-fact {background-color:#ecf0f1;padding:15px;border-left:4px solid #3498db;margin:20px 0;font-style:italic}.cat-breeds {display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin:20px 0}.breed-card {background-color:#fff3cd;padding:15px;border-radius:8px;border:1px solid #ffeaa7}.breed-card h3 {margin-top:0;color:#d63031}ul {padding-left:20px}li {margin-bottom:8px}.paw-print {font-size:1.2em;color:#e17055}footer {text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #ddd;color:#7f8c8d}</style></head><body><div class=container><h1>🐱 All About Cats 🐱</h1><div class=fun-fact><strong>Fun Fact:</strong>Cats have been companions to humans for over 9,000 years and are one of the most popular pets worldwide!</div><h2>Why Cats Make Great Pets</h2><ul><li><span class=paw-print>🐾</span>Independent yet affectionate</li><li><span class=paw-print>🐾</span>Natural pest controllers</li><li><span class=paw-print>🐾</span>Low maintenance compared to dogs</li><li><span class=paw-print>🐾</span>Provide emotional support and companionship</li><li><span class=paw-print>🐾</span>Excellent hunters with sharp reflexes</li></ul><h2>Cat Behavior & Communication</h2><p>Cats communicate through various methods including meowing, purring, body language, and scent marking. Each cat has a unique personality, and understanding their signals helps build a stronger bond with your feline friend.</p><div class=fun-fact><strong>Did You Know?</strong>Cats can make over 100 different vocal sounds, while dogs can only make about 10!</div><h2>Popular Cat Breeds</h2><div class=cat-breeds><div class=breed-card><h3>Persian</h3><p>Known for their long, luxurious coats and calm temperament. They prefer quiet environments and gentle handling.</p></div><div class=breed-card><h3>Siamese</h3><p>Vocal and social cats with distinctive color patterns. They're intelligent and form strong bonds with their owners.</p></div><div class=breed-card><h3>Maine Coon</h3><p>Large, gentle giants with tufted ears and bushy tails. They're known for their friendly and dog-like personalities.</p></div><div class=breed-card><h3>British Shorthair</h3><p>Sturdy cats with dense coats and round faces. They're calm, independent, and great for families.</p></div></div><h2>Cat Care Essentials</h2><ul><li><span class=paw-print>🐾</span>Provide fresh water and high-quality food daily</li><li><span class=paw-print>🐾</span>Keep the litter box clean</li><li><span class=paw-print>🐾</span>Regular veterinary checkups</li><li><span class=paw-print>🐾</span>Brush their coat regularly</li><li><span class=paw-print>🐾</span>Provide scratching posts and toys</li><li><span class=paw-print>🐾</span>Create safe indoor environments</li></ul><div class=fun-fact><strong>Amazing Fact:</strong>A cat's purr vibrates at a frequency that can promote healing and reduce stress in both cats and humans!</div><footer><p>Cats: Independent, mysterious, and absolutely purr-fect! 🐈</p></footer></div></body></html>" };
    try {
        const response = await fetch(`${server}/getWebPage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return { success: true, message: data.message };
    } catch (error) {
        console.error('Error fetching site content:', error);
        return { success: false, message: '' };
    }
};

export const createContract = async (): Promise<{ success: boolean; contractAddress?: string }> => {
    // wait 5 seconds
    //await new Promise(resolve => setTimeout(resolve, 5000));
    //return { success: true, contractAddress: '0200f26949b2531214e8a27e56c8d639febc980e94ba7f5424cf535a4306b2451d2b' };
    try {
        const response = await fetch(`${server}/generateNewPageContract`, {
            method: 'POST',

        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return { success: true, contractAddress: data.contractAddress };
    } catch (error) {
        console.error('Error creating contract:', error);
        return { success: false };
    }
};

export const setHtmlCode = async (
    address: string,
    title: string,
    description: string,
    message: string,
): Promise<{ success: boolean; title: string }> => {
    //console.log('setHtmlCode called with:', { address, title, description, message });

    //return { success: true, title: title };

    try {
        const response = await fetch(`${server}/setValuesPage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address, title, description, message }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, nota: si los codigos de estatus estan mal (por ejemplo siempre da 200) este chance es un error feik`);
        }
        return { success: true, title: title };
    } catch (error) {
        console.error('Error setting HTML code:', error);
        return { success: false, title: '' };
    }
};

export const addAddressToIndex = async (address: string, title: string): Promise<{ success: boolean }> => {
    //endpoint add address

    try {
        const response = await fetch(`${server2}/addAddress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address, title }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return { success: true };
    } catch (error) {
        console.error('Error adding address to index:', error);
        return { success: false };
    }
};

export const openSiteContentInNewTab = async (address: string): Promise<void> => {
    const baseUrl = window.location.origin; // Gets the current protocol, host, and port
    const url = `${baseUrl}/${address}`;
    window.open(url, '_blank');
};



