'use client';

import { getSiteContent } from '../dataProvider';
import { useEffect, useState } from 'react';

interface PageProps {
    params: Promise<{
        address: string[];
    }>;
}

export default async function AddressPage({ params }: PageProps) {
    const resolvedParams = await params;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const loadContent = async () => {
            try {
                // Reconstruct the address from URL segments
                const fullAddress = resolvedParams.address.join('/');
                
                // Decode the address in case it was URL encoded
                const decodedAddress = decodeURIComponent(fullAddress);
                
                const result = await getSiteContent(decodedAddress);
                
                if (result.success && result.message) {
                    // Replace the entire document content
                    document.open();
                    document.write(result.message);
                    document.close();
                } else {
                    setError('Failed to load site content');
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error loading site content:', err);
                setError('An error occurred while loading the site content');
                setLoading(false);
            }
        };

        if (resolvedParams.address && resolvedParams.address.length > 0) {
            loadContent();
        } else {
            setError('No address provided');
            setLoading(false);
        }
    }, [resolvedParams.address]);

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '18px',
                color: '#666',
                fontFamily: 'Arial, sans-serif'
            }}>
                Loading site content...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '18px',
                color: '#d32f2f',
                fontFamily: 'Arial, sans-serif'
            }}>
                <h2>Error</h2>
                <p>{error}</p>
                <a href="/" style={{ 
                    marginTop: '20px',
                    color: '#1976d2',
                    textDecoration: 'none'
                }}>
                    ← Back to Homepage
                </a>
            </div>
        );
    }

    // This will never render because document.write replaces everything
    return null;
}