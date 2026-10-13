function registerFields(fields, finalButton, errors) {
    const update = function() {
        updateFieldsValidity(fields, finalButton, errors);
    };

    for (let i = 0; i < fields.length; i++) {
        const currentField = fields[i];
        const nextField = fields[i+1];

        currentField.updateFieldsValidity = update;
        currentField.onchange = update;
        currentField.addEventListener("input", update);
        currentField.addEventListener("blur", update);
        
        if (currentField.tagName != "INPUT")
            continue;

        if (currentField.type == "tel")
            registerPhoneNumberInput(currentField);

        if (currentField.getAttribute("ad-type") == "username")
            registerUsernameInput(currentField);
        
        currentField.addEventListener("keydown", function(event) {
            if (event.key == "Enter") {
                if (nextField == null)
                    finalButton.click();
                else
                    nextField.focus();
            }
        });

        currentField.addEventListener("input", function() {
            if (currentField.type == "email" && window["Error_Email"]) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const isValid = emailRegex.test(currentField.value);

                if (isValid)
                    Error_Email.classList.add("hidden");
            }
            else if (currentField.type == "tel" && window["Error_Phone"]) {
                const isValid = Formatter.PhoneNumber(currentField.value, true) != "-";

                if (isValid)
                    Error_Phone.classList.add("hidden");
            }
            else if (currentField.getAttribute("ad-type") == "nik" && window["Error_NIK"]) {
                const isValid = /[0-9]/.test(currentField.value) && currentField.value.trim().length == 16;

                if (isValid)
                    Error_NIK.classList.add("hidden");
            }
            else if (currentField.getAttribute("ad-type") == "confirmpassword") {
                const isValid = Input_Password.value == Input_PasswordConfirm.value;
                
                if (isValid && window["Error_Password"])
                    Error_Password.classList.add("hidden");
            }
            else if (currentField.getAttribute("ad-type") == "name") {
                const isValid = currentField.value.trim().length >= 3;

                if (isValid && window["Error_Name"])
                    Error_Name.classList.add("hidden");
            }
        });

        currentField.addEventListener("blur", function() {
            if (currentField.type == "email" && window["Error_Email"]) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const isValid = emailRegex.test(currentField.value);

                if (isValid)
                    Error_Email.classList.add("hidden");
                else
                    Error_Email.classList.remove("hidden");
            }
            else if (currentField.type == "tel" && window["Error_Phone"]) {
                const isValid = Formatter.PhoneNumber(currentField.value, true) != "-";

                if (isValid)
                    Error_Phone.classList.add("hidden");
                else
                    Error_Phone.classList.remove("hidden");
            }
            else if (currentField.getAttribute("ad-type") == "nik" && window["Error_NIK"]) {
                const isValid = /[0-9]/.test(currentField.value) && currentField.value.trim().length == 16;

                if (isValid)
                    Error_NIK.classList.add("hidden");
                else
                    Error_NIK.classList.remove("hidden");
            }
            else if (currentField.getAttribute("ad-type") == "confirmpassword") {
                const isValid = Input_Password.value == Input_PasswordConfirm.value;
                
                if (isValid && window["Error_Password"])
                    Error_Password.classList.add("hidden");
                else
                    Error_Password.classList.remove("hidden");
            }
            else if (currentField.getAttribute("ad-type") == "name") {
                const isValid = currentField.value.trim().length >= 3;

                if (isValid && window["Error_Name"])
                    Error_Name.classList.add("hidden");
                else
                    Error_Name.classList.remove("hidden");
            }
        });
    }

    finalButton.onclick = async function(event) {
        finalButton.disabled = true;
        for (const field of fields || [])
            field.disabled = true;

        if (finalButton.children[0].classList.contains("progressring"))
            finalButton.children[0].style.display = "block";

        const isSuccess = await finalButton.onaction();
        
        if (isSuccess == false) {
            for (const field of fields || [])
                field.disabled = false;
            finalButton.disabled = false;
            
            if (finalButton.children[0].classList.contains("progressring"))
                finalButton.children[0].style.display = "";

            update();
        }
    }

    fields[0]?.focus();
}

function updateFieldsValidity(fields, finalButton, errors) {
    let isEmpty = false;

    for (const field of fields || []) {
        if (isEmpty)
            break;
        if (field.tagName == "INPUT") {
            if (field.value.trim() == "")
                isEmpty = true;
            else if (field.required && field.checked == false)
                isEmpty = true
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

    for (const error of errors || []) {
        if (isEmpty)
            break;
        if (error.classList.contains("hidden") == false)
            isEmpty = true;
    }

    finalButton.disabled = isEmpty;
}

function registerUsernameInput(input) {
    input.addEventListener("input", function() {
        input.value = input.value.toLowerCase().replaceAll(" ", "_").replaceAll(/[^0-9a-z\_\.]/g, "");
    })
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