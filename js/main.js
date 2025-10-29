$(document).ready(function() {
    console.log('jQuery loaded and ready!');

    let foodsData = [];
    let selectedFood = null;
    let defaultFoodsData = [];

    // Load foods data from localStorage or JSON
    function loadFoods() {
        const storedFoods = localStorage.getItem('foodsData');
        if (storedFoods) {
            foodsData = JSON.parse(storedFoods);
            console.log('Foods loaded from localStorage:', foodsData.length, 'items');
            renderFoodList();
        } else {
            $.getJSON('data/foods.json', function(data) {
                foodsData = data.foods;
                defaultFoodsData = JSON.parse(JSON.stringify(data.foods)); // Deep copy
                saveFoods();
                console.log('Foods loaded from JSON:', foodsData.length, 'items');
                renderFoodList();
            });
        }
    }

    // Save foods to localStorage
    function saveFoods() {
        localStorage.setItem('foodsData', JSON.stringify(foodsData));
        console.log('Foods saved to localStorage');
    }

    // Toggle food manager
    $('#toggleFoodManager').on('click', function() {
        $('#foodManagerContent').slideToggle();
        $(this).toggleClass('active');
    });

    // Render food list
    function renderFoodList(filter = '') {
        const container = $('#foodListContainer');
        container.empty();

        const filteredFoods = foodsData.filter(food =>
            food.name.toLowerCase().includes(filter.toLowerCase())
        );

        filteredFoods.sort((a, b) => a.name.localeCompare(b.name));

        filteredFoods.forEach((food, index) => {
            const foodItem = $(`
                <div class="food-item" data-index="${foodsData.indexOf(food)}">
                    <div class="food-info">
                        <input type="text" class="food-name-edit" value="${food.name}">
                        <input type="number" class="food-carbs-edit" value="${food.carbsPer100g}" step="0.1">
                        <span class="carbs-label">g/100g</span>
                    </div>
                    <div class="food-actions">
                        <button class="save-food-btn"><i class="fas fa-save"></i></button>
                        <button class="delete-food-btn"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `);
            container.append(foodItem);
        });
    }

    // Search foods
    $('#searchFood').on('input', function() {
        renderFoodList($(this).val());
    });

    // Add new food
    $('#addFoodForm').on('submit', function(e) {
        e.preventDefault();

        const name = $('#newFoodName').val().trim();
        const carbs = parseFloat($('#newFoodCarbs').val());

        if (name && carbs >= 0) {
            foodsData.push({ name: name, carbsPer100g: carbs });
            saveFoods();
            renderFoodList($('#searchFood').val());
            this.reset();
            alert('Food added successfully!');
        }
    });

    // Save food changes
    $('#foodListContainer').on('click', '.save-food-btn', function() {
        const foodItem = $(this).closest('.food-item');
        const index = parseInt(foodItem.data('index'));
        const newName = foodItem.find('.food-name-edit').val().trim();
        const newCarbs = parseFloat(foodItem.find('.food-carbs-edit').val());

        if (newName && newCarbs >= 0) {
            foodsData[index].name = newName;
            foodsData[index].carbsPer100g = newCarbs;
            saveFoods();
            renderFoodList($('#searchFood').val());
            alert('Food updated successfully!');
        }
    });

    // Delete food
    $('#foodListContainer').on('click', '.delete-food-btn', function() {
        if (confirm('Are you sure you want to delete this food?')) {
            const foodItem = $(this).closest('.food-item');
            const index = parseInt(foodItem.data('index'));
            foodsData.splice(index, 1);
            saveFoods();
            renderFoodList($('#searchFood').val());
        }
    });

    // Reset to default
    $('#resetFoods').on('click', function() {
        if (confirm('This will reset all foods to the default list. Are you sure?')) {
            $.getJSON('data/foods.json', function(data) {
                foodsData = data.foods;
                defaultFoodsData = JSON.parse(JSON.stringify(data.foods));
                saveFoods();
                renderFoodList();
                $('#searchFood').val('');
                alert('Food list reset to default!');
            });
        }
    });

    // Export foods to JSON file
    $('#exportFoods').on('click', function() {
        const dataStr = JSON.stringify({ foods: foodsData }, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'my-foods-list.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert('Food list exported successfully!');
    });

    // Import foods from JSON file
    $('#importFoods').on('click', function() {
        $('#importFile').click();
    });

    $('#importFile').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if (importedData.foods && Array.isArray(importedData.foods)) {
                        foodsData = importedData.foods;
                        saveFoods();
                        renderFoodList();
                        $('#searchFood').val('');
                        alert('Food list imported successfully!');
                    } else {
                        alert('Invalid file format. Please select a valid food list JSON file.');
                    }
                } catch (error) {
                    alert('Error reading file. Please make sure it\'s a valid JSON file.');
                }
            };
            reader.readAsText(file);
        }
        // Reset file input
        $(this).val('');
    });

    // Initialize
    loadFoods();

    // Autocomplete functionality
    $('#itemName').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        const dropdown = $('#autocomplete-dropdown');

        if (searchTerm.length < 1) {
            dropdown.hide().empty();
            selectedFood = null;
            return;
        }

        const matches = foodsData.filter(food =>
            food.name.toLowerCase().includes(searchTerm)
        ).slice(0, 10); // Limit to 10 results

        if (matches.length > 0) {
            dropdown.empty();
            matches.forEach(food => {
                const item = $('<div class="autocomplete-item"></div>')
                    .text(food.name)
                    .data('food', food)
                    .on('click', function() {
                        selectFood($(this).data('food'));
                    });
                dropdown.append(item);
            });
            dropdown.show();
        } else {
            dropdown.hide();
        }
    });

    // Handle click outside to close dropdown
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.autocomplete-wrapper').length) {
            $('#autocomplete-dropdown').hide();
        }
    });

    // Function to select a food from autocomplete
    function selectFood(food) {
        selectedFood = food;
        $('#itemName').val(food.name);
        $('#autocomplete-dropdown').hide();

        // Auto-calculate carbs when grams are entered
        const grams = parseFloat($('#itemGrams').val());
        if (grams > 0) {
            const carbs = (grams * food.carbsPer100g / 100).toFixed(1);
            $('#itemCarbs').val(carbs);
        }

        // Focus on grams input
        $('#itemGrams').focus();
    }

    // Auto-calculate carbs when grams change
    $('#itemGrams').on('input', function() {
        if (selectedFood) {
            const grams = parseFloat($(this).val());
            if (grams > 0) {
                const carbs = (grams * selectedFood.carbsPer100g / 100).toFixed(1);
                $('#itemCarbs').val(carbs);
            }
        }
    });

    // Handle form submission
    $('#addItemForm').on('submit', function(e) {
        e.preventDefault();

        const item = $('#itemName').val();
        const grams = parseFloat($('#itemGrams').val());
        const carbs = parseFloat($('#itemCarbs').val());

        // Add row to table with editable cells
        const row = `
            <tr>
                <td contenteditable="true" class="editable-cell">${item}</td>
                <td contenteditable="true" class="editable-cell editable-number">${grams}</td>
                <td contenteditable="true" class="editable-cell editable-number carb-value">${carbs}</td>
                <td><button class="delete-btn">Delete</button></td>
            </tr>
        `;

        $('#tableBody').append(row);

        // Clear form
        this.reset();
        selectedFood = null;

        // Update calculations
        updateCalculations();
    });

    // Handle delete button
    $('#tableBody').on('click', '.delete-btn', function() {
        $(this).closest('tr').remove();
        updateCalculations();
    });

    // Handle editing of cells - recalculate when carb values change
    $('#tableBody').on('blur', '.carb-value', function() {
        // Ensure it's a valid number
        const value = parseFloat($(this).text());
        if (isNaN(value)) {
            $(this).text('0');
        }
        updateCalculations();
    });

    // Handle divisor change
    $('#divisor').on('input', function() {
        updateCalculations();
    });

    // Function to update total and result
    function updateCalculations() {
        let total = 0;

        $('.carb-value').each(function() {
            total += parseFloat($(this).text()) || 0;
        });

        const divisor = parseFloat($('#divisor').val()) || 7.5;
        const result = total / divisor;

        $('#totalCarbs').text(total.toFixed(1));
        $('#finalResult').text(Math.round(result));
    }

});
