'use client';

import { indexedSite } from "./interfaces";
import { getIndexedSites } from "./dataProvider";
import { siteCard } from "./siteCard";
import WalletModal from "./walletModal";
import { useState, useEffect } from "react";

// lists the indexed sites with a google chrome interface
// allows fuzzy search of the indexed sites

export default function Browser() {
    const [indexedSites, setIndexedSites] = useState<indexedSite[]>([]);
    const [filteredSites, setFilteredSites] = useState<indexedSite[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const loadSites = async () => {
            const sites = await getIndexedSites();
            setIndexedSites(sites);
            setFilteredSites(sites);
        };
        loadSites();
    }, []);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setHasSearched(true);
        if (!query.trim()) {
            setFilteredSites(indexedSites);
        } else {
            const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
            
            const filtered = indexedSites.filter(site => {
                const searchText = [
                    site.title.toLowerCase(),
                    site.description.toLowerCase(),
                    site.address.toLowerCase()
                ].join(' ');
                
                // Check if all search terms are present (fuzzy matching)
                return searchTerms.every(term => 
                    searchText.includes(term) || 
                    // Simple fuzzy matching - allow single character differences
                    searchText.split(' ').some(word => 
                        word.includes(term) || 
                        (term.length > 3 && word.length > 3 && 
                         levenshteinDistance(word, term) <= 1)
                    )
                );
            });
            
            // Sort results by relevance (title matches first, then description, then URL)
            filtered.sort((a, b) => {
                const aTitle = a.title.toLowerCase();
                const bTitle = b.title.toLowerCase();
                const queryLower = query.toLowerCase();
                
                const aInTitle = aTitle.includes(queryLower);
                const bInTitle = bTitle.includes(queryLower);
                
                if (aInTitle && !bInTitle) return -1;
                if (!aInTitle && bInTitle) return 1;
                
                // If both or neither have title matches, sort by title alphabetically
                return aTitle.localeCompare(bTitle);
            });
            
            setFilteredSites(filtered);
        }
    };

    // Simple Levenshtein distance function for fuzzy matching
    const levenshteinDistance = (str1: string, str2: string): number => {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    };

    return (
        <>
            <WalletModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
            <div className={`chrome-browser ${!hasSearched ? 'homepage' : 'results-page'}`}>
            {!hasSearched ? (
                // Google homepage-style initial view
                <div className="homepage-container">
                    <div className="logo-container">
                        <h1 className="logo">rainfall</h1>
                    </div>
                    <div className="homepage-search-container">
                        <div className="search-bar homepage-search-bar">
                            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <input 
                                type="text" 
                                placeholder="Search rainfall..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                                className="search-input"
                            />
                            {searchQuery && (
                                <button 
                                    className="clear-search"
                                    onClick={() => {
                                        setSearchQuery("");
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <div className="homepage-buttons">
                            <button 
                                className="search-button-homepage"
                                onClick={() => handleSearch(searchQuery)}
                            >
                                Search Rainfall
                            </button>
                            <button 
                                className="create-website-button"
                                onClick={() => setIsModalOpen(true)}
                            >
                                Create a Website
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // Search results view
                <>
                    {/* Google-style header */}
                    <div className="search-header">
                        <div className="search-header-content">
                            <button className="logo-button" onClick={() => {
                                setHasSearched(false);
                                setSearchQuery("");
                                setFilteredSites(indexedSites);
                            }}>
                                <h1 className="logo logo-small">rainfall</h1>
                            </button>
                            <div className="search-container">
                                <div className="search-bar">
                                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <path d="m21 21-4.35-4.35"></path>
                                    </svg>
                                    <input 
                                        type="text" 
                                        placeholder="Search rainfall..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                                        className="search-input"
                                    />
                                    {searchQuery && (
                                        <button 
                                            className="clear-search"
                                            onClick={() => {
                                                setSearchQuery("");
                                                setHasSearched(false);
                                                setFilteredSites(indexedSites);
                                            }}
                                        >
                                            ×
                                        </button>
                                    )}
                                    <button 
                                        className="search-button"
                                        onClick={() => handleSearch(searchQuery)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <path d="m21 21-4.35-4.35"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Results info */}
                        <div className="results-info">
                            About {filteredSites.length.toLocaleString()} results
                        </div>
                    </div>

                    {/* Search results */}
                    <div className="search-results">
                        {filteredSites.map((site, index) => (
                            <div key={index}>
                                {siteCard(site)}
                            </div>
                        ))}
                    </div>
                </>
            )}
            </div>
        </>
    );
}
