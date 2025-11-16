title: "Test Markdown File" author: "Test User" date: "2025-11-16" tags: [markdown, test]

My Markdown Test File

This file tests if our parsers can extract data from a Markdown file.

JSON Code Block

Here is a JSON code block. Our parser should find and extract this, even with the "json" language tag.

{
  "productId": "md-123",
  "name": "Markdown Widget",
  "inStock": true,
  "warehouses": [
    {"loc": "east", "qty": 50},
    {"loc": "west", "qty": 30}
  ]
}


HTML Table

Markdown allows raw HTML. Our HTML parser should find this table.

<table>
<thead>
<tr><th>SKU</th><th>Color</th><th>Price</th></tr>
</thead>
<tbody>
<tr><td>MD-123-R</td><td>Red</td><td>19.99</td></tr>
<tr><td>MD-123-B</td><td>Blue</td><td>19.99</td></tr>
</tbody>
</table>

CSV Data

Here is some raw contributor data.

username,commits,reviews
user-a,15,3
user-b,22,5
user-c,8,1