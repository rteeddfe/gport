-- Drop the per-product currency: the store charges in rubles only,
-- prices are kopeck integers and no UI ever offered a currency choice.
ALTER TABLE "Product" DROP COLUMN "currency";
