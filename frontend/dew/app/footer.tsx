'use client';

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <div className="footer-logo">
                        <span className="footer-brand">RainFall</span>
                    </div>
                    <p className="footer-description">
                        Browse the permaweb
                    </p>
                </div>
                
                <div className="footer-section">
                    <h4 className="footer-heading">About</h4>
                    <ul className="footer-links">
                        <li><a href="#" className="footer-link">About Midnight</a></li>
                        <li><a href="#" className="footer-link">About Omar Sanchez</a></li>
                        <li><a href="#" className="footer-link">About Sofia Moreno</a></li>
                    </ul>
                </div>

            </div>
            
            <div className="footer-bottom">
                <p className="footer-copyright">
                    © {new Date().getFullYear()} Rainfall. All rights reserved.
                </p>
            </div>
        </footer>
    );
}