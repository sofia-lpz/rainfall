'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import * as dataProvider from './dataProvider';

export default function CreateWebsite() {
    const searchParams = useSearchParams();
    const [websiteTitle, setWebsiteTitle] = useState('');
    const [websiteDescription, setWebsiteDescription] = useState('');
    const [contractAddress, setContractAddress] = useState<string>('');
    const [htmlCode, setHtmlCode] = useState(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <style>
        body {
            font-family: arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            color: #333;
            text-align: center;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <h1>Welcome to My Website</h1>
    <p>This is a sample website. Edit the HTML on the left to see changes here!</p>
    <p>You can add more content, styles, and even JavaScript.</p>
</body>
</html>`);

    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
    const [loadingStep, setLoadingStep] = useState<'processing' | 'deploying' | 'indexing' | 'complete'>('processing');
    const [loadingMessage, setLoadingMessage] = useState('');
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Comprehensive HTML minification function
    const minifyHtml = (html: string): string => {
        let minified = html;
        
        // Remove HTML comments
        minified = minified.replace(/<!--[\s\S]*?-->/g, '');
        
        // Remove unnecessary whitespace and line breaks
        minified = minified.replace(/\s+/g, ' ');
        minified = minified.replace(/\n|\r/g, '');
        
        // Remove whitespace around HTML tags
        minified = minified.replace(/>\s+</g, '><');
        minified = minified.replace(/>\s+/g, '>');
        minified = minified.replace(/\s+</g, '<');
        
        // Minify CSS within style tags
        minified = minified.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
            let minifiedCss = css;
            
            // Remove CSS comments
            minifiedCss = minifiedCss.replace(/\/\*[\s\S]*?\*\//g, '');
            
            // Remove unnecessary whitespace in CSS
            minifiedCss = minifiedCss.replace(/\s+/g, ' ');
            minifiedCss = minifiedCss.replace(/;\s+/g, ';');
            minifiedCss = minifiedCss.replace(/:\s+/g, ':');
            minifiedCss = minifiedCss.replace(/,\s+/g, ',');
            minifiedCss = minifiedCss.replace(/{\s+/g, '{');
            minifiedCss = minifiedCss.replace(/\s+}/g, '}');
            minifiedCss = minifiedCss.replace(/}\s+/g, '}');
            
            // Remove trailing semicolons before closing braces
            minifiedCss = minifiedCss.replace(/;}/g, '}');
            
            // Remove unnecessary units for zero values
            minifiedCss = minifiedCss.replace(/\b0px\b/g, '0');
            minifiedCss = minifiedCss.replace(/\b0em\b/g, '0');
            minifiedCss = minifiedCss.replace(/\b0rem\b/g, '0');
            minifiedCss = minifiedCss.replace(/\b0%\b/g, '0');
            
            // Shorten hex colors where possible
            minifiedCss = minifiedCss.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/g, '#$1$2$3');
            
            return `<style>${minifiedCss.trim()}</style>`;
        });
        
        // Replace double quotes with single quotes for attributes
        minified = minified.replace(/="([^"]*)"/g, "='$1'");
        
        // Remove redundant attribute values
        minified = minified.replace(/\s+type=['"]text\/css['"]/gi, '');
        minified = minified.replace(/\s+type=['"]text\/javascript['"]/gi, '');
        
        // Remove optional closing tags for void elements and optional tags
        minified = minified.replace(/<\/?(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)[^>]*>/gi, (match) => {
            return match.replace(/\s*\/?>/, match.includes('/>') ? '/>' : '>');
        });
        
        // Remove quotes from attributes when not needed (simple values without spaces)
        minified = minified.replace(/=(['"])([a-zA-Z0-9\-_]+)\1/g, '=$2');
        
        // Trim any remaining leading/trailing whitespace
        minified = minified.trim();
        
        return minified;
    };

    // Read contract address from URL parameters
    useEffect(() => {
        const contract = searchParams.get('contract');
        if (contract) {
            setContractAddress(contract);
        }
    }, [searchParams]);

    // Update the iframe content when HTML changes
    useEffect(() => {
        if (iframeRef.current) {
            const iframe = iframeRef.current;
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc) {
                doc.open();
                doc.write(htmlCode);
                doc.close();
            }
        }
    }, [htmlCode]);

    const handleSendToNet = async () => {
        if (!websiteTitle.trim()) {
            alert('Please enter a website title before deploying.');
            return;
        }
        
        if (!contractAddress.trim()) {
            alert('No contract address found. Please create a contract first.');
            return;
        }
        
        // Initialize loading states
        setIsSending(true);
        setShowLoadingOverlay(true);
        setSendStatus('idle');
        setLoadingStep('processing');
        setLoadingMessage('Preparing your website for deployment...');
        
        try {
            // Step 1: Process HTML code
            setLoadingStep('processing');
            setLoadingMessage('Minifying and optimizing your HTML code...');
            await new Promise(resolve => setTimeout(resolve, 800)); // Brief pause for user feedback
            const processedHtmlCode = minifyHtml(htmlCode);
            
            // Step 2: Deploy to network
            setLoadingStep('deploying');
            setLoadingMessage('Deploying your website to the decentralized network...');
            const result = await dataProvider.setHtmlCode(
                contractAddress,
                websiteTitle,
                websiteDescription,
                processedHtmlCode
            );
            
            if (result && result.success) {
                // Step 3: Add to index
                setLoadingStep('indexing');
                setLoadingMessage('Adding your website to the public index...');
                
                try {
                    const indexResult = await dataProvider.addAddressToIndex(contractAddress, websiteTitle);
                    
                    // Step 4: Complete
                    setLoadingStep('complete');
                    setLoadingMessage('Website successfully deployed!');
                    
                    if (indexResult.success) {
                        setSendStatus('success');
                        console.log('Website successfully deployed and added to index');
                    } else {
                        setSendStatus('success'); // Still show success for deployment
                        console.warn('Website deployed successfully, but failed to add to index');
                    }
                } catch (indexError) {
                    console.error('Error adding website to index:', indexError);
                    setLoadingStep('complete');
                    setLoadingMessage('Website deployed! (Index update failed)');
                    setSendStatus('success'); // Still show success for deployment
                }
                
                // Hide overlay after showing success briefly, then open website and redirect
                setTimeout(() => {
                    setShowLoadingOverlay(false);
                    setSendStatus('idle');
                    
                    // Open the deployed website in a new tab using the direct address URL
                    const siteUrl = `/${encodeURIComponent(contractAddress)}`;
                    window.open(siteUrl, '_blank');
                    
                    // Redirect current tab back to the browser/search page
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 500); // Small delay to ensure new tab opens first
                }, 2000);
            } else {
                setShowLoadingOverlay(false);
                setSendStatus('error');
                alert('Failed to deploy website. Please try again.');
            }
        } catch (error) {
            console.error('Error deploying website:', error);
            setShowLoadingOverlay(false);
            setSendStatus('error');
            alert('An error occurred while deploying the website.');
        } finally {
            setIsSending(false);
        }
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset to the default template? This will lose all your changes.')) {
            setHtmlCode(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <style>
        body {
            font-family: arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            color: #333;
            text-align: center;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <h1>Welcome to My Website</h1>
    <p>This is a sample website. Edit the HTML on the left to see changes here!</p>
    <p>You can add more content, styles, and even JavaScript.</p>
</body>
</html>`);
        }
    };

    const downloadHtml = () => {
        const blob = new Blob([htmlCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'website.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="website-builder">
            <div className="builder-header">
                <div className="header-left">
                    <button 
                        className="back-button"
                        onClick={() => window.location.href = '/'}
                        title="Back to search"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5"></path>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back
                    </button>
                    <h1>Website Builder</h1>
                </div>
                <div className="header-actions">
                    <button 
                        className="action-button secondary" 
                        onClick={handleReset}
                        title="Reset to default template"
                    >
                        Reset
                    </button>
                    <button 
                        className="action-button secondary" 
                        onClick={downloadHtml}
                        title="Download HTML file"
                    >
                        Download
                    </button>
                    <button 
                        className={`action-button primary ${isSending ? 'loading' : ''} ${sendStatus === 'success' ? 'success' : ''} ${sendStatus === 'error' ? 'error' : ''}`}
                        onClick={handleSendToNet}
                        disabled={isSending}
                    >
                        <span className="button-text">
                            {isSending ? 'Deploying...' : sendStatus === 'success' ? 'Deployed!' : 'Send to Rainfall'}
                        </span>
                    </button>
                </div>
            </div>

            <div className="website-info-form">
                <div className="form-group">
                    <label htmlFor="websiteTitle">Title</label>
                    <textarea
                        id="websiteTitle"
                        value={websiteTitle}
                        onChange={(e) => setWebsiteTitle(e.target.value)}
                        placeholder="Enter your website title"
                        className="form-input"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="websiteDescription">Description</label>
                    <textarea
                        id="websiteDescription"
                        value={websiteDescription}
                        onChange={(e) => setWebsiteDescription(e.target.value)}
                        placeholder="Enter your website description"
                        className="form-input"
                        style={{ width: '500px' }}
                    />
                </div>
            </div>

            <div className="builder-content">
                <div className="editor-panel">
                    <div className="panel-header">
                        <h3>HTML Editor</h3>
                        <div className="editor-info">
                            Lines: {htmlCode.split('\n').length} | Characters: {htmlCode.length}
                        </div>
                    </div>
                    <textarea
                        className="html-editor"
                        value={htmlCode}
                        onChange={(e) => setHtmlCode(e.target.value)}
                        placeholder="Write your HTML code here..."
                        spellCheck={false}
                    />
                </div>

                <div className="preview-panel">
                    <div className="panel-header">
                        <h3>Live Preview</h3>
                        <div className="preview-controls">
                            <button 
                                className="refresh-button"
                                onClick={() => {
                                    if (iframeRef.current) {
                                        iframeRef.current.src = iframeRef.current.src;
                                    }
                                }}
                                title="Refresh preview"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <polyline points="1 20 1 14 7 14"></polyline>
                                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="preview-container">
                        <iframe
                            ref={iframeRef}
                            className="preview-iframe"
                            title="Website Preview"
                            sandbox="allow-scripts allow-same-origin"
                        />
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {showLoadingOverlay && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="loading-spinner"></div>
                        <h3 className="loading-title">Deploying Your Website</h3>
                        <p className="loading-description">{loadingMessage}</p>
                        
                        <div className="loading-progress">
                            <div className={`loading-step ${loadingStep === 'processing' ? 'active' : loadingStep !== 'processing' ? 'completed' : ''}`}>
                                <div className="loading-step-icon"></div>
                                <span>Processing</span>
                            </div>
                            <div className={`loading-step ${loadingStep === 'deploying' ? 'active' : ['indexing', 'complete'].includes(loadingStep) ? 'completed' : ''}`}>
                                <div className="loading-step-icon"></div>
                                <span>Deploying</span>
                            </div>
                            <div className={`loading-step ${loadingStep === 'indexing' ? 'active' : loadingStep === 'complete' ? 'completed' : ''}`}>
                                <div className="loading-step-icon"></div>
                                <span>Indexing</span>
                            </div>
                            <div className={`loading-step ${loadingStep === 'complete' ? 'active completed' : ''}`}>
                                <div className="loading-step-icon"></div>
                                <span>Complete</span>
                            </div>
                        </div>
                        
                        <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            {loadingStep === 'complete' 
                                ? 'Opening your website and returning to browser...' 
                                : 'Please wait while we deploy your website to the decentralized network.'
                            }
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
}
