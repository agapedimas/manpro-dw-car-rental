
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
    cancelButton.onclick = o => popover.close();
    
    popover.onopened = function() {
        updateInputValidity(fields, finalButton, popover);
        fields.at(0)?.focus();
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

        if (currentField.type == "tel")
            registerPhoneNumberInput(currentField);
        
        if (currentField.getAttribute("ad-type") == "username")
            registerUsernameInput(currentField);

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

function registerUsernameInput(input) {
    input.addEventListener("input", function() {
        input.value = input.value.toLowerCase().replaceAll(" ", "_").replaceAll(/[^0-9a-z\_\.]/g, "");
    })
}

function registerCurrencyInput(input) {
    let initialValue = input.value ? input.value.replace(/[^0-9]/g, "") : "";
    input.valueInt = parseInt(initialValue, 10) || 0;

    const enforcePrefix = function(e) {
        let minPos = this.value === "Rp0" ? 3 : (this.value.startsWith("Rp") ? 2 : 0);
        if (this.selectionStart < minPos && this.selectionStart == this.selectionEnd) {
            if (e && e.type == "focus") {
                this.setSelectionRange(this.value.length, this.value.length);
            } else {
                this.setSelectionRange(minPos, minPos);
            }
        }
    };

    input.addEventListener("click", enforcePrefix);
    input.addEventListener("keyup", enforcePrefix);
    input.addEventListener("focus", enforcePrefix);

    input.addEventListener("keydown", function(e) {
        let minPos = this.value === "Rp0" ? 3 : (this.value.startsWith("Rp") ? 2 : 0);

        if (this.selectionStart <= minPos && this.selectionStart == this.selectionEnd) {
            if (e.key === "ArrowLeft") {
                e.preventDefault(); 
            }
            if (e.key === "Backspace" && this.selectionStart === minPos) {
                e.preventDefault(); 
                this.value = "";
                this.valueInt = 0;
                this.dispatchEvent(new Event("input")); 
            }
        }
    });

    input.addEventListener("input", function () {
        let cursorPosition = this.selectionStart;
        let originalValue = this.value;
        let digitsBeforeCursor = 0;
        
        for (let i = 0; i < cursorPosition; i++)
            if (/\d/.test(originalValue[i]))
                digitsBeforeCursor++;
        
        let rawValue = this.value.replace(/[^0-9]/g, "");
        this.valueInt = rawValue ? parseInt(rawValue, 10) : 0;

        if (rawValue.length > 0) {
            let strippedZerosCount = rawValue.length - this.valueInt.toString().length;
            
            if (this.valueInt === 0)
                strippedZerosCount = rawValue.length - 1;
            
            if (strippedZerosCount > 0)
                digitsBeforeCursor = Math.max(0, digitsBeforeCursor - strippedZerosCount);
        }

        this.value = Formatter.Amount(rawValue, true);
        
        let newCursorPos = -1;
        let digitsCounted = 0;
        
        for (let i = 0; i < this.value.length; i++) {
            if (digitsCounted == digitsBeforeCursor) {
                newCursorPos = i;
                break;
            }
            if (/\d/.test(this.value[i]))
                digitsCounted++;
        }
        
        if (newCursorPos == -1 || rawValue === "") {
            newCursorPos = this.value.length;
        }

        let minPosAfter = this.value === "Rp0" ? 3 : (this.value.startsWith("Rp") ? 2 : 0);
        if (newCursorPos < minPosAfter)
            newCursorPos = minPosAfter;

        if (this.selectionStart == this.selectionEnd)
            this.setSelectionRange(newCursorPos, newCursorPos);

        if (this.oninput)
            this.oninput();
    });
}

function registerPhoneNumberInput(input) {
    const enforcePrefix = function() {
        let val = this.value;
        let minPos = val.startsWith("+62 ") ? 4 : (val.startsWith("+62") ? 3 : 0);
        
        if (this.selectionStart < minPos && this.selectionStart == this.selectionEnd)
            this.setSelectionRange(minPos, minPos);
    };

    input.addEventListener("click", enforcePrefix);
    input.addEventListener("keyup", enforcePrefix);
    input.addEventListener("focus", enforcePrefix);

    input.addEventListener("keydown", function(e) {
        let val = this.value;
        let minPos = val.startsWith("+62 ") ? 4 : (val.startsWith("+62") ? 3 : 0);

        if (this.selectionStart <= minPos) {
            if (e.key === "ArrowLeft") {
                e.preventDefault(); 
            }
            if (e.key === "Backspace" && this.selectionStart === minPos && this.selectionEnd === minPos) {
                e.preventDefault(); 
                this.value = "";
                this.dispatchEvent(new Event("input")); 
            }
        }
    });

    input.addEventListener("input", function() {
        let cursorPosition = this.selectionStart;
        let originalValue = this.value;
        let digitsBeforeCursor = 0;
        
        for (let i = 0; i < cursorPosition; i++) {
            if (/\d/.test(originalValue[i])) {
                digitsBeforeCursor++;
            }
        }

        let rawOriginal = originalValue.replace(/\D/g, "");
        let addedDigits = 0;
        
        if (rawOriginal.startsWith("0"))
            addedDigits = 1;
        else if (rawOriginal.length > 0 && !rawOriginal.startsWith("62") && rawOriginal !== "6")
            addedDigits = 2;
        
            
        if (digitsBeforeCursor > 0)
            digitsBeforeCursor += addedDigits;
            
        this.value = this.value.replaceAll(/[^0-9\+\-\s]/g, "");
        this.value = Formatter.PhoneNumber(this.value, false);
        
        let newCursorPos = -1;
        let digitsCounted = 0;
        
        for (let i = 0; i < this.value.length; i++) {
            if (digitsCounted === digitsBeforeCursor) {
                newCursorPos = i;
                break;
            }
            if (/\d/.test(this.value[i])) {
                digitsCounted++;
            }
        }
        
        if (newCursorPos === -1) {
            newCursorPos = this.value.length;
        }

        let minPosAfter = this.value.startsWith("+62 ") ? 4 : (this.value.startsWith("+62") ? 3 : 0);
        if (newCursorPos < minPosAfter) {
            newCursorPos = minPosAfter;
        }

        this.setSelectionRange(newCursorPos, newCursorPos);
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