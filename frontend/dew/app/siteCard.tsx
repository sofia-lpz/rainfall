import { indexedSite } from "./interfaces";
import { openSiteContentInNewTab } from "./dataProvider";

export const siteCard = (site: indexedSite) => {
    // Format URL for display (remove protocol and trailing slash)
    const displayUrl = site.address
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');

    const handleSiteClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        await openSiteContentInNewTab(site.address);
    };

    return (
        <div className="search-result">
            <div className="result-url">
                <span className="url-breadcrumb">{displayUrl}</span>
            </div>
            <h3 className="result-title">
                <a 
                    href="#" 
                    onClick={handleSiteClick}
                    style={{ cursor: 'pointer' }}
                >
                    {site.title}
                </a>
            </h3>
            <p className="result-description">
                {site.description}
            </p>
        </div>
    );
};
