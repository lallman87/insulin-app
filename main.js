// Initialize Supabase client
if (!window.supabaseClient) {
  const supabaseUrl = "https://rrcftwfddvlzjdynacoc.supabase.co";
  const supabaseKey = "sb_publishable_PRhMoODj2VvDMd4oN7eGww_TVj1zIGS";

  window.supabaseClient = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
  );
}

const $outputDiv = $("#output");
let categories = [];
let selectedCarbs = 0;
let insulinRatio = 7.5; // Default ratio

// Function to fetch categories from database
async function fetchCategories() {
  try {
    console.log("Fetching categories...");
    const { data, error } = await window.supabaseClient
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return [];
    }

    console.log("Categories fetched successfully:", data);
    categories = data || [];
    console.log("Categories array set to:", categories);
    return categories;
  } catch (err) {
    console.error("Exception fetching categories:", err);
    return [];
  }
}

// Function to populate accordion with items
function populateAccordion(data) {
  const $accordion = $("#categoryAccordion");
  $accordion.html("");

  console.log("Categories:", categories);
  console.log("Items:", data);

  categories.forEach((categoryObj, index) => {
    const categoryName = categoryObj.name;
    const items = data.filter(item => item.category === categoryName)
      .sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Category: ${categoryName}, Matching items:`, items);
    
    const itemsHtml = items.length === 0 
      ? `<p class="mb-0">There are no ${categoryName} items</p>`
      : items.map(item => `
          <div class="carb-item">
            <button class="btn carb-button" 
                    data-carbs="${item.carbs}">
              ${item.name} <span class="fw-bold">${parseFloat(item.carbs)}</span>
            </button>
            <div class="qty-controls">
              <button class="btn btn-sm qty-minus" disabled>−</button>
              <input type="number" class="item-qty" value="1" min="1" readonly>
              <button class="btn btn-sm qty-plus">+</button>
            </div>
          </div>
        `).join("");

    const accordionItem = `
      <div class="accordion-item">
        <div class="accordion-header">
          <button class="accordion-button fw-bold collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${categoryObj.id}">
            ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
          </button>
        </div>
        <div id="collapse${categoryObj.id}" class="accordion-collapse collapse">
          <div class="accordion-body">
            ${itemsHtml}
          </div>
        </div>
      </div>
    `;

    $accordion.append(accordionItem);
  });

  // Carb button click
  $(".carb-button").click(function(e) {
    e.preventDefault();
    $(this).toggleClass("active");
    
    // Toggle active class on qty-controls
    $(this).closest(".carb-item").find(".qty-controls").toggleClass("active");
    
    // If deselecting, reset quantity to 1
    if (!$(this).hasClass("active")) {
      const $qtyInput = $(this).closest(".carb-item").find(".item-qty");
      $qtyInput.val(1);
      
      // Disable minus button
      $(this).closest(".carb-item").find(".qty-minus").prop("disabled", true);
    }
    
    updateCarbTotals();
  });

  // Quantity minus button
  $(".qty-minus").click(function(e) {
    e.preventDefault();
    const $input = $(this).siblings(".item-qty");
    let qty = parseInt($input.val());
    if (qty > 1) {
      qty--;
      $input.val(qty);
      $(this).prop("disabled", qty === 1);
      updateCarbTotals();
    }
  });

  // Quantity plus button
  $(".qty-plus").click(function(e) {
    e.preventDefault();
    const $input = $(this).siblings(".item-qty");
    let qty = parseInt($input.val());
    qty++;
    $input.val(qty);
    $(this).siblings(".qty-minus").prop("disabled", false);
    updateCarbTotals();
  });
}

// Function to populate category dropdowns
async function populateCategoryDropdowns() {
  try {
    const options = categories.map(cat => 
      `<option value="${cat.name}">${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</option>`
    ).join("");

    $("#itemCategory").html(options);
    $("#updateCategory").html(options);
    
    // Populate category select dropdowns for update/delete
    const categoryOptions = categories.map(cat =>
      `<option value="${cat.id}">${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</option>`
    ).join("");
    
    $("#updateCategoryId").html('<option value="">Select Category</option>' + categoryOptions);
    $("#deleteCategoryId").html('<option value="">Select Category</option>' + categoryOptions);
  } catch (err) {
    console.error("Error populating dropdowns:", err);
  }
}

// Function to populate category management list
async function populateCategoryList() {
  try {
    const $categoryList = $("#categoryList");
    $categoryList.html("");

    categories.forEach(cat => {
      const item = `
        <div class="d-flex align-items-center justify-content-between p-2 border-bottom">
          <span>${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</span>
          <button class="btn btn-sm btn-danger delete-category" data-category-id="${cat.id}" data-category-name="${cat.name}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      $categoryList.append(item);
    });

    // Attach delete category click handler
    $(".delete-category").click(async function(e) {
      e.preventDefault();
      const categoryId = $(this).data("category-id");
      const categoryName = $(this).data("category-name");
      
      if (confirm(`Are you sure you want to delete the category "${categoryName}"?`)) {
        await deleteCategory(categoryId);
      }
    });
  } catch (err) {
    console.error("Error populating category list:", err);
  }
}

// Function to add new category
async function addCategory(name) {
  try {
    if (!name || name.trim() === "") {
      $outputDiv.html(`<div class="alert alert-danger">Please enter a category name</div>`);
      return;
    }

    const { data, error } = await window.supabaseClient
      .from("categories")
      .insert([{ name: name.toLowerCase().trim() }])
      .select();

    if (error) {
      $outputDiv.html(`<div class="alert alert-danger">Error: ${error.message}</div>`);
      return;
    }

    const categoryDisplay = name.charAt(0).toUpperCase() + name.slice(1);
    $outputDiv.html(`<div class="alert alert-success">✓ You've added the <strong>${categoryDisplay}</strong> category.</div>`);
    await fetchCategories();
    populateCategoryDropdowns();
    $("#newCategoryName").val("");
  } catch (err) {
    $outputDiv.html(`<div class="alert alert-danger">Error: ${err.message}</div>`);
  }
}

// Function to update category
async function updateCategoryForm(categoryId, newName) {
  try {
    if (!categoryId) {
      $outputDiv.html(`<div class="alert alert-danger">Please select a category</div>`);
      return;
    }

    if (!newName || newName.trim() === "") {
      $outputDiv.html(`<div class="alert alert-danger">Please enter a new category name</div>`);
      return;
    }

    const { data, error } = await window.supabaseClient
      .from("categories")
      .update({ name: newName.toLowerCase().trim() })
      .eq("id", categoryId)
      .select();

    if (error) {
      $outputDiv.html(`<div class="alert alert-danger">Error: ${error.message}</div>`);
      return;
    }

    const oldName = categories.find(c => c.id === categoryId)?.name || "Category";
    const oldDisplay = oldName.charAt(0).toUpperCase() + oldName.slice(1);
    const newDisplay = newName.charAt(0).toUpperCase() + newName.slice(1);
    $outputDiv.html(`<div class="alert alert-success">✓ You've updated <strong>${oldDisplay}</strong> to <strong>${newDisplay}</strong>.</div>`);
    await fetchCategories();
    populateCategoryDropdowns();
    $("#updateCategoryId").val("");
    $("#updateCategoryName").val("");
  } catch (err) {
    $outputDiv.html(`<div class="alert alert-danger">Error: ${err.message}</div>`);
  }
}

// Function to delete category
async function deleteCategory(categoryId) {
  try {
    if (!categoryId) {
      $outputDiv.html(`<div class="alert alert-danger">Please select a category</div>`);
      return;
    }

    const categoryName = categories.find(c => c.id === parseInt(categoryId))?.name || "Unknown";
    
    if (!confirm(`Are you sure you want to delete the category "${categoryName}"?`)) {
      return;
    }

    const { error } = await window.supabaseClient
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      $outputDiv.html(`<div class="alert alert-danger">Error: ${error.message}</div>`);
      return;
    }

    const categoryDisplay = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
    $outputDiv.html(`<div class="alert alert-success">✓ You've deleted the <strong>${categoryDisplay}</strong> category.</div>`);
    await fetchCategories();
    populateCategoryDropdowns();
    $("#deleteCategoryId").val("");
  } catch (err) {
    $outputDiv.html(`<div class="alert alert-danger">Error: ${err.message}</div>`);
  }
}

// Function to update carb totals
function updateCarbTotals() {
  let totalCarbs = 0;

  $(".carb-button.active").each(function() {
    const carbs = parseFloat($(this).data("carbs"));
    const qty = parseInt($(this).closest(".carb-item").find(".item-qty").val());
    totalCarbs += carbs * qty;
  });
  
  selectedCarbs = totalCarbs;
  const insulinDecimal = totalCarbs / insulinRatio;
  const insulin = Math.round(insulinDecimal);
  
  $("#totalCarbs").text(totalCarbs.toFixed(2));
  $("#totalInsulin").text(insulin);
}

// Function to load items into dropdowns
async function loadItemsIntoDropdowns() {
  try {
    const { data, error } = await window.supabaseClient
      .from("project-items")
      .select("id, name");

    if (error) {
      console.error("Error loading items:", error);
      return;
    }

    const $updateSelect = $("#updateId");
    const $deleteSelect = $("#deleteId");

    // Clear existing options (keep placeholder)
    $updateSelect.html('<option value="">Select Item ID</option>');
    $deleteSelect.html('<option value="">Select Item ID</option>');

    // Add items to both dropdowns
    data.forEach(item => {
      $updateSelect.append(`<option value="${item.id}">${item.id} - ${item.name}</option>`);
      $deleteSelect.append(`<option value="${item.id}">${item.id} - ${item.name}</option>`);
    });
  } catch (err) {
    console.error("Exception:", err);
  }
}

// READ - Load all data
$("#load").click(async function() {
  try {
    const { data, error } = await window.supabaseClient
      .from("project-items")
      .select("*")
      .order("category", { ascending: true });

    if (error) {
      $outputDiv.text(`Error: ${error.message}`);
    } else {
      $outputDiv.text(JSON.stringify(data, null, 2));
      populateAccordion(data);
      loadItemsIntoDropdowns();
    }
  } catch (err) {
    $outputDiv.text(`Exception: ${err.message}`);
  }
});

// CREATE - Insert new item
$("#insert").click(async function() {
  const name = $("#itemName").val();
  const carbs = parseFloat($("#itemCarbs").val());
  const category = $("#itemCategory").val();

  console.log("Name:", name, "| Carbs:", carbs, "| Category:", category);

  if (!name || isNaN(carbs) || !category) {
    $outputDiv.html(`<div class="alert alert-danger">Please fill in all fields.</div>`);
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("project-items")
      .insert([{ name, carbs, category }])
      .select();

    if (error) {
      $outputDiv.html(`<div class="alert alert-danger">Error: ${error.message}</div>`);
    } else {
      const categoryDisplay = category.charAt(0).toUpperCase() + category.slice(1);
      $outputDiv.html(`<div class="alert alert-success">✓ You've added <strong>${name}</strong> with <strong>${carbs}g</strong> carbs to the <strong>${categoryDisplay}</strong> category.</div>`);
      $("#itemName").val("");
      $("#itemCarbs").val("");
      $("#itemCategory").val("");
      loadItemsIntoDropdowns();
    }
  } catch (err) {
    $outputDiv.html(`<div class="alert alert-danger">Error: ${err.message}</div>`);
  }
});

// UPDATE - Update existing item
$("#update").click(async function() {
  const id = parseInt($("#updateId").val());
  const name = $("#updateName").val();
  const carbs = $("#updateCarbs").val();
  const category = $("#updateCategory").val();

  if (!id) {
    $outputDiv.html(`<div class="alert alert-danger">Please select an Item ID</div>`);
    return;
  }

  // Build update object with only non-empty fields
  const updateData = {};
  if (name) updateData.name = name;
  if (carbs !== "") updateData.carbs = parseFloat(carbs);
  if (category) updateData.category = category;

  if (Object.keys(updateData).length === 0) {
    $outputDiv.html(`<div class="alert alert-danger">Please fill in at least one field to update</div>`);
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("project-items")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      $outputDiv.html(`<div class="alert alert-danger">Error: ${error.message}</div>`);
    } else {
      const updatedItem = data[0];
      const categoryDisplay = updatedItem.category.charAt(0).toUpperCase() + updatedItem.category.slice(1);
      $outputDiv.html(`<div class="alert alert-success">✓ You've updated <strong>${updatedItem.name}</strong> with <strong>${updatedItem.carbs}g</strong> carbs in the <strong>${categoryDisplay}</strong> category.</div>`);
      $("#updateId").val("");
      $("#updateName").val("");
      $("#updateCarbs").val("");
      $("#updateCategory").val("");
      loadItemsIntoDropdowns();
      
      // Reload accordion
      const { data: allData } = await window.supabaseClient
        .from("project-items")
        .select("*")
        .order("category", { ascending: true });
      populateAccordion(allData);
    }
  } catch (err) {
    $outputDiv.html(`<div class="alert alert-danger">Error: ${err.message}</div>`);
  }
});

// DELETE - Delete item
$("#delete").click(async function() {
  const id = parseInt($("#deleteId").val());

  if (!id) {
    $outputDiv.html(`<div class="alert alert-danger">Please select an Item ID</div>`);
    return;
  }

  try {
    // Get the item name before deleting
    const { data: itemData } = await window.supabaseClient
      .from("project-items")
      .select("name")
      .eq("id", id)
      .single();

    const { data, error } = await window.supabaseClient
      .from("project-items")
      .delete()
      .eq("id", id);

    if (error) {
      $outputDiv.html(`<div class="alert alert-danger">Error: ${error.message}</div>`);
    } else {
      const itemName = itemData?.name || "Item";
      $outputDiv.html(`<div class="alert alert-success">✓ You've deleted <strong>${itemName}</strong>.</div>`);
      $("#deleteId").val("");
      loadItemsIntoDropdowns();
    }
  } catch (err) {
    $outputDiv.html(`<div class="alert alert-danger">Error: ${err.message}</div>`);
  }
});

// Insulin ratio button functionality
$(".insulin-ratio-btn").click(function() {
  // Remove active class from all buttons
  $(".insulin-ratio-btn").removeClass("active");
  
  // Add active class to clicked button
  $(this).addClass("active");
  
  // Update the insulin ratio
  insulinRatio = parseFloat($(this).data("value"));
  
  // Recalculate totals with new ratio
  updateCarbTotals();
});

// Reset button functionality
$("#reset").click(function() {
  // Remove active class from all carb buttons
  $(".carb-button").removeClass("active");
  
  // Reset insulin ratio to default (7.5)
  $(".insulin-ratio-btn").removeClass("active");
  $(".insulin-ratio-btn[data-value='7.5']").addClass("active");
  insulinRatio = 7.5;
  
  // Reset totals to 0
  selectedCarbs = 0;
  $("#totalCarbs").text("0");
  $("#totalInsulin").text("0");
});

// Load dropdowns and accordion on page load
$(document).ready(async function() {
  // Fetch categories first
  await fetchCategories();
  console.log("Categories loaded:", categories);
  populateCategoryDropdowns();
  
  // Category management buttons
  $("#addCategory").click(function() {
    const categoryName = $("#newCategoryName").val();
    addCategory(categoryName);
  });
  
  $("#updateCategoryBtn").click(function() {
    const categoryId = parseInt($("#updateCategoryId").val());
    const categoryName = $("#updateCategoryName").val();
    updateCategoryForm(categoryId, categoryName);
  });
  
  $("#deleteCategoryBtn").click(function() {
    const categoryId = parseInt($("#deleteCategoryId").val());
    deleteCategory(categoryId);
  });
  
  loadItemsIntoDropdowns();
  
  try {
    const { data, error } = await window.supabaseClient
      .from("project-items")
      .select("*")
      .order("category", { ascending: true });

    if (error) {
      console.error("Error loading items:", error);
      return;
    }

    console.log("Items loaded:", data);
    console.log("Categories at time of populate:", categories);
    populateAccordion(data);
  } catch (err) {
    console.error("Exception:", err);
  }
});