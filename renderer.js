const loadItems = async () => {
    const items = await window.api.getItems();
    const listElement = document.getElementById('inventoryList');
    listElement.innerHTML = ''; // clear current items

    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${item.price.toFixed(2)}</td>
    `;
        listElement.appendChild(row);
    });
};

document.getElementById('addItemBtn').addEventListener('click', async () => {
    const nameInput = document.getElementById('itemName');
    const qtyInput = document.getElementById('itemQuantity');
    const priceInput = document.getElementById('itemPrice');

    const name = nameInput.value;
    const quantity = parseInt(qtyInput.value, 10);
    const price = parseFloat(priceInput.value);

    if (!name) return alert('Name is required!');

    const item = { name, quantity, price };

    // Call the main process to insert the item
    await window.api.addItem(item);

    // Clear inputs
    nameInput.value = '';
    qtyInput.value = '0';
    priceInput.value = '0.00';

    // Reload the list
    await loadItems();
});

// Load items on startup
loadItems();
