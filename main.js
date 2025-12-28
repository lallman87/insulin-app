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
const categories = ["breakfast", "lunch", "dinner", "drinks", "snacks", "fruit", "veggies"];
let selectedCarbs = 0;
let insulinRatio = 7.5; // Default ratio

// Function to populate accordion with items
function populateAccordion(data) {
  const $accordion = $("#categoryAccordion");
  $accordion.html("");

  categories.forEach((category, index) => {
    const items = data.filter(item => item.category === category)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const itemsHtml = items.length === 0 
      ? `<p class="mb-0">There are no ${category} items</p>`
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
          <button class="accordion-button ${index !== 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${category}">
            ${category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        </div>
        <div id="collapse${category}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}">
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
    $outputDiv.text(`Please fill in all fields. Name: "${name}", Carbs: ${carbs}, Category: "${category}"`);
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("project-items")
      .insert([{ name, carbs, category }])
      .select();

    if (error) {
      $outputDiv.text(`Error: ${error.message}`);
    } else {
      $outputDiv.text(`Item added!\n${JSON.stringify(data, null, 2)}`);
      $("#itemName").val("");
      $("#itemCarbs").val("");
      $("#itemCategory").val("");
      loadItemsIntoDropdowns();
    }
  } catch (err) {
    $outputDiv.text(`Exception: ${err.message}`);
  }
});

// UPDATE - Update existing item
$("#update").click(async function() {
  const id = parseInt($("#updateId").val());
  const name = $("#updateName").val();
  const carbs = $("#updateCarbs").val();
  const category = $("#updateCategory").val();

  if (!id) {
    $outputDiv.text("Please select an Item ID");
    return;
  }

  // Build update object with only non-empty fields
  const updateData = {};
  if (name) updateData.name = name;
  if (carbs !== "") updateData.carbs = parseFloat(carbs);
  if (category) updateData.category = category;

  if (Object.keys(updateData).length === 0) {
    $outputDiv.text("Please fill in at least one field to update");
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("project-items")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      $outputDiv.text(`Error: ${error.message}`);
    } else {
      $outputDiv.text(`Item updated!\n${JSON.stringify(data, null, 2)}`);
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
    $outputDiv.text(`Exception: ${err.message}`);
  }
});

// DELETE - Delete item
$("#delete").click(async function() {
  const id = parseInt($("#deleteId").val());

  if (!id) {
    $outputDiv.text("Please select an Item ID");
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("project-items")
      .delete()
      .eq("id", id);

    if (error) {
      $outputDiv.text(`Error: ${error.message}`);
    } else {
      $outputDiv.text(`Item deleted!`);
      $("#deleteId").val("");
      loadItemsIntoDropdowns();
    }
  } catch (err) {
    $outputDiv.text(`Exception: ${err.message}`);
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

    populateAccordion(data);
  } catch (err) {
    console.error("Exception:", err);
  }
});