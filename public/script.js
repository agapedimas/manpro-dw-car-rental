function appendFilter(filterId, filterList, defaultFilterValue = "", onFilterChange) {
    const context = Components.ContextMenu.List.find(o => o.id == filterId);  
    for (const item of filterList.reverse()) {
        context.commands.unshift(
            {
                value: item.value,
                Checked: false,
                Title: item.label,
                Action: o => changeFilter(filterId, item.value, onFilterChange)
            }
        );
    } 
    changeFilter(filterId, defaultFilterValue);
}

function changeFilter(filterId, value, onFilterChange) {
    const context = Components.ContextMenu.List.find(o => o.id == filterId);
    for (const item of context.commands) {
        if (item.value == value)
            item.Checked = true;
        else
            item.Checked = false;
    }
    if (onFilterChange)
        onFilterChange();
}

function getSelectedFilter(filterId) { 
    const context = Components.ContextMenu.List.find(o => o.id == filterId);
    for (const item of context.commands) {
        if (item.Checked == true)
            return item.value;
    }
}

function registerInput(fields, cancelButton, finalButton, popover) {
    cancelButton.onclick = function() {
        popover.close();
    }
    
    popover.onopened = function() {
        updateInputValidity(fields, finalButton, popover);
        fields.at(0)?.focus();
        setTimeout(function() {
            popover.content.scrollLeft = 0;
        }, 1);
    };

    for (let i = 0; i < fields.length; i++) {
        const currentField = fields[i];
        const nextField = fields[i+1];

        currentField.onchange =
        currentField.oninput = function(event) {
            updateInputValidity(fields, finalButton, popover);
        }

        if (currentField.tagName != "INPUT")
            continue;

        currentField.onkeydown = function(event) {
            if (event.key == "Enter") {
                if (nextField == null)
                    finalButton.click();
                else
                    nextField.focus();
            }
        }

        if (currentField.getAttribute("ad-type") == "currency")
            registerCurrencyInput(currentField);
    }

    finalButton.onclick = async function(event) {
        finalButton.disabled = true;
        for (const field of fields)
            field.disabled = true;

        popover.isloading = true;
        popover.iscloseable = false;

        const isSuccess = await finalButton.onaction();
        popover.isloading = false;
        popover.iscloseable = true;

        for (const field of fields)
            field.disabled = false;
        
        if (isSuccess == false) {
            updateInputValidity(fields, finalButton, popover);
        }
        else {
            popover.close();
        }
    }
}

function registerCurrencyInput(input) {
    input.addEventListener("focus", function() {
        this.value = this.value.replace(/[^0-9]/g, "");
        this.valueInt = parseInt(this.value || 0);
        this.value = this.valueInt + "";
    });

    input.addEventListener("input", function () {
        this.value = this.value.replace(/[^0-9]/g, "");
        this.valueInt = parseInt(this.value);
    });

    input.addEventListener("blur", function() {
        this.value = Formatter.Amount(parseInt(this.value.replace(/[^0-9]/g, "")) || 0);
    });
}

function updateInputValidity(fields, finalButton) {
    let isEmpty = false;

    for (const field of fields) {
        if (field.tagName == "INPUT") {
            if (field.value.trim() == "")
                isEmpty = true;
        }
        else if (field.tagName == "TEXTAREA") {
            if (field.value.trim() == "")
                isEmpty = true;
        }
        else if (field.tagName == "SELECT") {
            if (field.value.trim() == "")
                isEmpty = true;
        }
        else {
            if (field.classList.contains("filled") == false)
                isEmpty = true;
        }
    }

    finalButton.disabled = isEmpty;
}

async function urlToBlob(url)
{
	let blob = await fetch(url).then(response => 
	{ 
		if (response.ok)
			return response.blob();
		
		return null;
	});

	if (blob == null)
		return "";
	else
		return URL.createObjectURL(blob);
}