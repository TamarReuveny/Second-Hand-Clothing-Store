# Product Spec — Second-Hand Clothing Marketplace

## What problem does this product solve?
People have used clothes sitting unused that still have value, and other people want
affordable, sustainable clothing but don't have an easy way to buy second-hand items
from individual sellers online. This product connects the two sides in a simple,
trustworthy web marketplace: sellers list items in minutes, buyers browse and purchase
with confidence.

## Who are the users?
- **Buyers** (primary focus) — people browsing and purchasing second-hand clothing.
- **Sellers** — individuals listing their own used clothing for sale. A marketplace
  requires this role by definition (buyers need something to buy), even though the
  product experience is optimized around buyers.
- **Admin/moderator** — reviews listings and users, handles disputes/reports, keeps
  the catalog clean.

## Who is the customer?
The buyer is both the user and the customer (pays directly for items). The seller is
also a customer in the sense that the platform provides them a channel to sell —
whether the platform takes a commission is a business-model decision to define later
(e.g., % fee per sale, or free listings funded by ads/subscriptions).

## Business goals
- Enable selling of used clothing/services (marketplace transaction volume)
- Help buyers make better purchase decisions (search, filters, item condition/photos,
  seller ratings)
- Reduce friction/time to list an item and to find a specific item
- Build trust between strangers transacting (ratings, verified listings, reporting)

## Software capabilities needed to support these goals
- Account creation & login (buyer/seller/admin roles)
- Item listing creation (photos, description, category, size, condition, price)
- Browse/search/filter catalog (category, size, price range, condition)
- Item detail page
- Cart / checkout / payment
- Saved/favorited items (buyer can bookmark listings to revisit later)
- Order history (buyer) and sales history (seller)
- Seller dashboard (manage own listings, mark sold, edit/delete)
- Ratings/reviews of sellers (and optionally buyers)
- Admin moderation (approve/remove listings, manage users, handle reports)
- Notifications (basic — e.g., "your item sold", "order shipped")

## Key user flows
1. Sign up / log in (buyer or seller)
2. Seller: create a listing (upload photos, set price/category/size/condition)
3. Buyer: browse/search/filter items
4. Buyer: view item detail page
5. Buyer: add to cart and checkout (payment)
6. Seller: view and manage their own listings (edit, mark sold, delete)
7. Buyer: view order history / order status
8. Buyer/Seller: leave a rating after a completed transaction
9. Admin: review reported listings/users, remove/ban if needed

## Out of scope (v1)
- Shipping label generation / carrier integration
- In-app messaging between buyer and seller (may be a stretch goal)
- Returns/refunds workflow beyond a manual admin process
