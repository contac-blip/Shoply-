export class Product {
  constructor({
    id,
    name,
    description,
    brand_name,
    price,
    price_after_discount,
    discount_percent,
    image_urls,
    category_id,
    category_name,
    stock_quantity,
    created_at,
    updated_at,
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.brand_name = brand_name;
    this.price = price;
    this.price_after_discount = price_after_discount;
    this.discount_percent = discount_percent;
    this.image_urls = image_urls;
    this.category_id = category_id;
    this.category_name = category_name;
    this.stock_quantity = stock_quantity;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  static fromDb(row) {
    return new Product({
      id: row.id,
      name: row.name,
      description: row.description,
      brand_name: row.brand_name,
      price: Number(row.price),
      price_after_discount: row.price_after_discount !== undefined && row.price_after_discount !== null
        ? Number(row.price_after_discount)
        : null,
      discount_percent: row.discount_percent,
      image_urls: row.image_urls || [],
      category_id: row.category_id,
      category_name: row.category_name,
      stock_quantity: row.stock_quantity,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
}
