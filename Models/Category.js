export class Category {
  constructor({
    id,
    name,
    image_url,
    svg_src,
    parent_id,
    created_at,
    updated_at,
  }) {
    this.id = id;
    this.name = name;
    this.image_url = image_url;
    this.svg_src = svg_src;
    this.parent_id = parent_id;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  static fromDb(row) {
    return new Category({
      id: row.id,
      name: row.name,
      image_url: row.image_url,
      svg_src: row.svg_src,
      parent_id: row.parent_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
}
