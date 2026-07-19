# Diecast Collector Mobile App — MVP

## Overview

The mobile app will be a companion to the existing admin website.

The mobile app is for quick daily tasks on a phone. The admin website will remain available for large or complex tasks such as bulk updates, imports, and management.

Both applications will use the same Supabase database.

## MVP Goal

The first version should help the user:

- Scan a diecast box.
- Check whether the item is already owned or pre-ordered.
- Search for an item manually.
- View purchase and pre-order details.
- Add a new purchase or pre-order quickly.
- Update payment and collection status.

## 1. Personal Login

- Sign in using the existing Supabase account.
- Keep the user signed in after the first login.
- Protect purchase prices and personal collection data.
- Allow only the owner to add or update data.

## 2. Home Dashboard

Show a simple summary of the collection:

- Total models owned.
- Total units owned.
- Total active pre-orders.
- Pre-orders ready for collection.
- Unpaid or partially paid orders.
- Recent purchases.
- A large **Scan Diecast** button.

## 3. Smart Scanner

The scanner should support:

- Taking a photo with the camera.
- Selecting an existing image from the gallery.
- Reading a barcode when available.
- Reading text from the box with OCR.
- Detecting an item number such as `MGT00012`.
- Detecting the brand or model name when possible.
- Searching the Supabase database for matching items.

If there is no exact match, the app should show a short list of possible matches for the user to select.

## 4. Scan Result

After an item is found, show:

- Product image.
- Brand.
- Model name.
- Item number.
- Scale.
- Normal or chase variant.
- Owned quantity.
- Pre-order quantity.
- Payment status.
- Collection status.
- Shop or platform.
- Purchase history.

Example:

```text
MINI GT
Nissan Skyline GT-R
MGT00012

Owned: 2
Pre-order: 1
Unpaid: 1
Ready to collect: 1
```

The result page should also provide these actions:

- View full details.
- Add a purchase.
- Add a pre-order.
- Update an existing order.

## 5. Duplicate Warning

When the user scans or adds an item that already exists, show a clear warning.

Example:

```text
You already own 2 units of this item.
You also have 1 unit on pre-order.
```

The warning should not block the user from buying another unit.

## 6. Manual Search

Allow the user to search without using the camera.

Search fields should include:

- Item number.
- Model name.
- Brand.
- Scale.
- Normal or chase variant.

The search should support partial text and small typing mistakes where possible.

## 7. Quick Purchase Entry

Allow the user to add a purchase directly from a scan or search result.

The form should include:

- Item.
- Normal or chase variant.
- Quantity.
- Price per unit.
- Shop or platform.
- Purchase type.
- Payment status.
- Payment date.
- Collection date.
- Order link.
- Notes.

The form should reuse existing item and shop data from Supabase.

## 8. Pre-order Tracker

Group pre-orders by status:

- Awaiting production.
- Ready to collect.
- Unpaid.
- Partially paid.
- Fully paid.
- Collected.
- Cancelled.

Quick actions should include:

- Mark as ready.
- Add a payment.
- Mark as fully paid.
- Mark as collected.
- Mark as cancelled.
- Open the order link.

## 9. Mobile Catalog

Provide a simple image-first catalog:

- Two-column image grid.
- Brand filter.
- Owned filter.
- Pre-order filter.
- Not-owned filter.
- Normal and chase indicators.
- Item detail page.
- Pull to refresh.
- Load more items while scrolling.

The existing web catalog can be used as the design reference.

## Admin Website Responsibilities

The following tasks will remain on the admin website for the first version:

- Brand management.
- Shop management.
- Bulk imports.
- Bulk status updates.
- Image imports.
- Complex table editing.
- Database maintenance.
- Detailed reports.
- User and access management.

## Suggested Development Order

1. Create the Flutter project.
2. Connect the app to Supabase.
3. Add login and session handling.
4. Build the mobile catalog and manual search.
5. Build the item detail and ownership status pages.
6. Add camera, barcode, and OCR scanning.
7. Add scan matching and duplicate warnings.
8. Add quick purchase and pre-order forms.
9. Add the pre-order tracker and quick status updates.
10. Build and test the app on a physical phone.

## MVP Completion Criteria

The MVP is complete when the user can:

1. Open the app and sign in.
2. Scan a diecast box or search manually.
3. See whether the item is owned, pre-ordered, unpaid, or ready to collect.
4. See a warning when the item already exists in the collection.
5. Add a new purchase or pre-order.
6. Update payment and collection status from the phone.

