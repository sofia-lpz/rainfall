'use client';

import { useState, useEffect } from 'react';
import { createContract } from './dataProvider';

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
    const [contractAddress, setContractAddress] = useState<string>('');
    const [isCreatingContract, setIsCreatingContract] = useState<boolean>(false);
    const [contractCreated, setContractCreated] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [depositAccountNumber, setDepositAccountNumber] = useState<string>('');

    // Generate deposit account and create contract when modal opens
    useEffect(() => {
        if (isOpen) {
            // Set the specific deposit account number
            setDepositAccountNumber('mn_shield-addr_test1kaak22cyvzc3qqznzd70f3nf30plx7lqhhm7jgqearcsy6fg9hkqxqyu0pyfj2kyqwe2fx8x3jqhqmrnd6k28phz7waefxz9ftd4xnvr6vpaxrgu');
            
            const createNewContract = async () => {
                setIsCreatingContract(true);
                setError('');
                setContractCreated(false);
                setContractAddress('');
                
                try {
                    const result = await createContract();
                    if (result.success && result.contractAddress) {
                        setContractAddress(result.contractAddress);
                        setContractCreated(true);
                    } else {
                        setError('Failed to create contract. Please try again.');
                    }
                } catch (err) {
                    setError('An error occurred while creating the contract.');
                    console.error('Contract creation error:', err);
                } finally {
                    setIsCreatingContract(false);
                }
            };
            
            createNewContract();
        }
    }, [isOpen]);

    // Close modal when clicking outside or pressing escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const copyToClipboard = () => {
        if (contractAddress) {
            navigator.clipboard.writeText(contractAddress);
            // You could add a toast notification here
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create Website Contract</h2>
                    <button className="modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>
                
                <div className="modal-body">
                    {isCreatingContract && depositAccountNumber && (
                        <div className="deposit-container">
                            <p className="modal-description">
                                Please deposit 3 dust to this account to create your website smart contract:
                            </p>
                            
                            <div className="account-number-container">
                                <label className="account-label">Deposit Account:</label>
                                <div className="account-number-display">
                                    <span className="account-number">{depositAccountNumber}</span>
                                    <button 
                                        className="copy-button"
                                        onClick={() => {
                                            if (depositAccountNumber) {
                                                navigator.clipboard.writeText(depositAccountNumber);
                                            }
                                        }}
                                        title="Copy to clipboard"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <p className="deposit-legend">
                                Creating your contract... Please wait.
                            </p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="error-container">
                            <p className="error-message">{error}</p>
                            <button 
                                className="retry-button"
                                onClick={() => {
                                    // Trigger contract creation again
                                    const createNewContract = async () => {
                        // Set the specific deposit account number
                        setDepositAccountNumber('mn_shield-addr_test1kaak22cyvzc3qqznzd70f3nf30plx7lqhhm7jgqearcsy6fg9hkqxqyu0pyfj2kyqwe2fx8x3jqhqmrnd6k28phz7waefxz9ftd4xnvr6vpaxrgu');                                        setIsCreatingContract(true);
                                        setError('');
                                        setContractCreated(false);
                                        setContractAddress('');
                                        
                                        try {
                                            const result = await createContract();
                                            if (result.success && result.contractAddress) {
                                                setContractAddress(result.contractAddress);
                                                setContractCreated(true);
                                            } else {
                                                setError('Failed to create contract. Please try again.');
                                            }
                                        } catch (err) {
                                            setError('An error occurred while creating the contract.');
                                            console.error('Contract creation error:', err);
                                        } finally {
                                            setIsCreatingContract(false);
                                        }
                                    };
                                    createNewContract();
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                    
                    {contractCreated && contractAddress && (
                        <>
                            <p className="modal-description">
                                Your website smart contract has been created successfully! Save this contract address to manage your website.
                            </p>
                            
                            <div className="account-number-container">
                                <label className="account-label">Contract Address:</label>
                                <div className="account-number-display">
                                    <span className="account-number">{contractAddress}</span>
                                    <button 
                                        className="copy-button"
                                        onClick={copyToClipboard}
                                        title="Copy to clipboard"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                <div className="modal-footer">
                    <button className="modal-button secondary" onClick={onClose}>
                        Close
                    </button>
                    <button 
                        className="modal-button primary"
                        disabled={!contractCreated || isCreatingContract}
                        onClick={() => {
                            if (contractCreated && contractAddress) {
                                // Navigate to website builder with contract address
                                window.location.href = `/create-website?contract=${encodeURIComponent(contractAddress)}`;
                            }
                        }}
                    >
                        {isCreatingContract ? 'Creating Contract...' : contractCreated ? 'Continue' : 'Waiting for Contract...'}
                    </button>
                </div>
            </div>
        </div>
    );
}
