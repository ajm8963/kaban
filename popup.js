document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("downloadBtn").addEventListener("click", async () => {
        const loadingDots = document.getElementById("loadingDots");
        const statusText = document.getElementById("statusText");
        console.log("Кнопка нажата - начало обработки");

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log("Текущая вкладка:", tab.url);

        if (!tab.url || !tab.url.includes("mail.yandex.ru")) {
            console.error("Не Яндекс.Почта");
            return;
        }

        const url = new URL(tab.url);
        const uid = url.searchParams.get("uid");
        const hash = url.hash;
        const idMatch = hash.match(/message\/(\d+)/);
        const messageId = idMatch ? idMatch[1] : null;

        console.log("Извлеченные параметры:", {uid, messageId});

        if (!uid || !messageId) {
            console.error("Не удалось извлечь параметры");
            return;
        }



        const emlUrl = `https://mail.yandex.ru/web-api/message-source/liza1/${uid}/${messageId}/yandex_email.eml`;
        console.log("Формируем URL .eml:", emlUrl);



        // Показываем анимацию
        loadingDots.style.display = "block";
        statusText.textContent = "Загрузка данных...";
        fetch(emlUrl)
            .then(response => {
                console.log("Получен ответ от Яндекс.Почты, статус:", response.status);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.blob();
            })
            .then(blob => {
                console.log("Получен Blob, размер:", blob.size, "байт");

                if (blob.size === 0) {
                    throw new Error("Получен пустой файл");
                }

                const file = new File([blob], "письмо.eml", { type: "message/rfc822" });
                console.log("Создан File объект:", file.name, "размер:", file.size, "тип:", file.type);

                const reader = new FileReader();
                reader.onload = function(e) {
                    console.log("Чтение содержимого файла...");
                    const emailText = e.target.result;
                    console.log("Первые 200 символов файла:", emailText.substring(0, 200));

                    const emailMatch = emailText.match(/^From:.*<([^>]+)>/mi) || emailText.match(/^From:\s*([^\s<]+)/mi);
                    const senderEmail = emailMatch ? emailMatch[1] : "unknown@example.com";
                    console.log("Извлечен email отправителя:", senderEmail);
                    const referencesMatch = emailText.match(/^References:\s*(.+)/mi);
                    const references = referencesMatch
                        ? referencesMatch[1].trim().replace(/\s+/g, ', ')
                        : null;
                    console.log("References:", references);
                    const messageIdMatch = emailText.match(/^Message-ID:\s*<([^>]+)>/mi);
                    const messageIdMail = messageIdMatch ? messageIdMatch[1] : null;
                    console.log("Id письма: ", messageIdMail);

                    const formData = new FormData();
                    formData.append("messageId", messageIdMail)
                    if (references) {
                        formData.append("references", references);

                    }
                    formData.append("uid", uid);
                    formData.append("email", senderEmail);
                    formData.append("document", file);


                    for (let [key, value] of formData.entries()) {
                        if (value instanceof File) {
                            console.log(`FormData: ${key} = File(${value.name}, ${value.size} bytes)`);
                        } else {
                            console.log(`FormData: ${key} = ${value}`);
                        }
                    }

                    console.log("Отправка данных на сервер...");
                    fetch("http://localhost:8080/api/upload", {
                        method: "POST",
                        body: formData
                    })
                        .then(res => {
                            console.log("Ответ сервера, статус:", res.status);
                            return res;
                        })
                        .then(data => {
                            console.log("Успешный ответ сервера:", data);

                            statusText.textContent = "✅";
                            loadingDots.style.display = "none";
                        })
                        .catch(err => {
                            console.error("Ошибка при отправке:", err);
                            statusText.textContent = `❌`;
                            loadingDots.style.display = "none";
                        });
                };

                reader.onerror = function(e) {
                    console.error("Ошибка чтения файла:", e.target.error);
                };

                reader.readAsText(file);
            })
            .catch(err => {
                console.error("Ошибка в цепочке обработки:", err);
            });
    });
});