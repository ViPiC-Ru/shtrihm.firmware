/* 0.1.4 обновление прошивки касс

cscript firmware.min.js <image> [<build> [<model>]]

<image>		- путь к файлу с прошивкой.
<build>		- номер сборки прошивки в файле.
<model>		- фильтр по названию модели кассы.

*/

(function(wsh, undefined){// замыкаем что бы не сорить глобалы
	var value, fso, image, build, model, driver, table, now,
		speed, isUpdated = false, timeout = 15 * 1000,
		password = 30, error = 0;
	
	fso = new ActiveXObject('Scripting.FileSystemObject'); 
	// получаем путь к файлу прошивки
	if(!error){// если нету ошибок
		if(0 < wsh.arguments.length){// если передан параметр
			value = wsh.arguments(0);
			if(value){// если задано
				image = fso.getAbsolutePathName(value);
			};
		};
	};
	// получаем номер сборки прошивки
	if(!error){// если нету ошибок
		if(1 < wsh.arguments.length){// если передан параметр
			value = wsh.arguments(1);
			if(value){// если задано
				build = value;
			};
		};
	};
	// получаем название модели кассы
	if(!error){// если нету ошибок
		if(2 < wsh.arguments.length){// если передан параметр
			value = wsh.arguments(2);
			if(value){// если задано
				model = value.toLowerCase();
			};
		};
	};
	// проверяем наличее файла прошивки
	if(!error && image){// если нужно выполнить
		if(fso.fileExists(image)){// если файл существует
		}else error = 1;
	};
	// создаём объект для взаимодейсивия с кассой
	if(!error){// если нету ошибок
		try{// пробуем подключиться к кассе
			driver = new ActiveXObject('Addin.DrvFR');
			speed = driver.BaudRate;
			driver.Password = password;
			driver.GetECRStatus();
			if(!driver.ResultCode){// если запрос выполнен
			}else error = 2;
		}catch(e){error = 2;};
	};
	// проверяем версию прошивки
	if(!error && build){// если нужно выполнить
		value = driver.ECRBuild;
		if(build != value){// если другая прошивка
		}else error = 3;
	};

	// проверяем название модели кассы
	if(!error && model){// если нужно выполнить
		value = driver.UDescription.toLowerCase();
		if(~value.indexOf(model)){// если модель подходит
		}else error = 4;
	};
	// проверяем состояние смены
	if(!error){// если нету ошибок
		if(4 == driver.ECRMode){// если смена закрыта
		}else error = 5;
	};
	// сохраняем все значения таблицы
	if(!error){// если нету ошибок
		table = {};// сбрасываем значения таблицы
		// работаем с номером таблицы
		for(var i = 1; !driver.ResultCode; i++){
			driver.TableNumber = i;
			driver.GetTableStruct();
			// работаем с рядами и полями в них
			table[i] = {};// сбрасываем таблицу
			for(var j = 1, jLen = driver.RowNumber; !driver.ResultCode && j <= jLen; j++){
				table[i][j] = {};// сбрасываем ряд
				for(var k = 1, kLen = driver.FieldNumber; !driver.ResultCode && k <= kLen; k++){
					driver.TableNumber = i;// таблица
					driver.RowNumber = j;// ряд
					driver.FieldNumber = k;// поле
					driver.GetFieldStruct();
					if(!driver.ResultCode){// если данные получены
						driver.ReadTable();// получаем данные
						if(!driver.ResultCode){// если данные получены
							if(!driver.FieldType || 1 != driver.MAXValueOfField){
								if(driver.FieldType) value = driver.ValueOfFieldString;
								else value = driver.ValueOfFieldInteger;
								table[i][j][k] = value;
							};
						};
					};
				};
			};
		};
		if(93 == driver.ResultCode){// если данные получены
		}else error = 6;
	};
	// обновляем прошивку через usb
	if(!error && !isUpdated){// если нужно выполнить
		driver.UpdateFirmwareMethod = 0;// DFU
		driver.FileName = image;
		driver.UpdateFirmware();
		if(!driver.ResultCode){// если запрос выполнен
			while(1 == driver.UpdateFirmwareStatus) wsh.sleep(timeout);
			if(!driver.UpdateFirmwareStatus) isUpdated = true;
		}else error = 7;
	};
	// дожидаемся связи с ккм
	if(!error && !isUpdated){// если нужно выполнить
		driver.Password = password;
		driver.ConnectionTimeout = timeout;
		// ожидаем доступность порта
		driver.WaitConnection();
		for(var i = 0, iLen = 5; driver.ResultCode && i < iLen; i++){
			driver.WaitConnection();
			wsh.sleep(timeout);
		};
		if(!driver.ResultCode){// если данные получены
		}else error = 8;
	};
	// обновляем прошивку через com
	if(!error && !isUpdated){// если нужно выполнить
		driver.UpdateFirmwareMethod = 1;// XMODEM
		driver.FileName = image;
		driver.UpdateFirmware();
		if(!driver.ResultCode){// если запрос выполнен
			while(1 == driver.UpdateFirmwareStatus) wsh.sleep(timeout);
			if(!driver.UpdateFirmwareStatus) isUpdated = true; 
		}else error = 9;
	};
	// проверяем наличее карты памяти
	if(!error && !isUpdated){// если нужно выполнить
		driver.TableNumber = 14;// Sdcard status
		driver.RowNumber = 1;// First
		driver.FieldNumber = 1;// Status
		driver.GetFieldStruct();// запрашиваем структуру
		if(!driver.ResultCode){// если данные получены
			driver.ReadTable();// запрашиваем данные
			if(!driver.ResultCode){// если данные получены
				if(driver.FieldType) value = driver.ValueOfFieldString;
				else value = driver.ValueOfFieldInteger;
				if(0 == value){// если нет проблем с картой памяти
				}else error = 10;
			}else error = 10;
		}else error = 10;
	};
	// отключаем онлайн обновление
	if(!error && !isUpdated){// если нужно выполнить
		value = 0;// Работать с сервером скок
		driver.TableNumber = 23;// Aдминистрирование
		driver.RowNumber = 1;// First
		driver.FieldNumber = 1;// Работать с сервером скок
		driver.GetFieldStruct();// запрашиваем структуру
		if(!driver.ResultCode){// если данные получены
			if(driver.FieldType) driver.ValueOfFieldString = value;
			else driver.ValueOfFieldInteger = value;
			driver.WriteTable();// изменяем данные
			if(!driver.ResultCode){// если данные получены
			}else error = 11;
		}else error = 11;
	};
	// загружаем прошивку на карту память
	if(!error && !isUpdated){// если нужно выполнить
		driver.FileType = 1;// прошивка
		driver.FileName = image;
		driver.LoadFileOnSDCard();
		if(!driver.ResultCode){// если данные получены
		}else error = 12;
	};
	// перезагружаем кассу
	if(!error && !isUpdated){// если нужно выполнить
		driver.RebootKKT();
		if(!driver.ResultCode){// если данные получены
		}else error = 13;
	};
	// дожидаемся связи с ккм
	if(!error){// если нету ошибок
		driver.Password = password;
		driver.ConnectionTimeout = timeout;
		// ожидаем доступность порта
		driver.WaitConnection();
		for(var i = 0, iLen = 5; driver.ResultCode && i < iLen; i++){
			driver.WaitConnection();
			wsh.sleep(timeout);
		};
		// перебираем скорость порта
		for(var i = 0, iLen = 7; driver.ResultCode && i < iLen; i++){
			driver.BaudRate = i;
			driver.WaitConnection();
		};
		if(!driver.ResultCode){// если данные получены
		}else error = 14;
	};
	// проверяем режим работы
	if(!error && !isUpdated){// если нужно выполнить
		driver.GetECRStatus();
		if(!driver.ResultCode){// если запрос выполнен
			value = driver.ECRMode;
			if(9 == value){// если режим обнуления
			}else error = 15;
		}else error = 15;
	};
	// выполняем технологическое обнуление
	if(!error && !isUpdated){// если нужно выполнить
		driver.ResetSettings();
		if(!driver.ResultCode){// если запрос выполнен
		}else error = 16;
	};
	// устанавливаем время с компьютера
	if(!error){// если нету ошибок
		now = new Date();
		value = [// текушее время
			9 < now.getHours() ? now.getHours() : '0' + now.getHours(),
			9 < now.getMinutes() ? now.getMinutes() : '0' + now.getMinutes(),
			9 < now.getSeconds() ? now.getSeconds() : '0' + now.getSeconds()
		].join(':');
		driver.Time = value;
		driver.SetTime();
		if(!driver.ResultCode){// если запрос выполнен
		}else error = 17;
	};
	// устанавливаем дату с компьютера
	if(!error){// если нету ошибок
		value = [// текушее время
			9 < now.getDate() ? now.getDate() : '0' + now.getDate(),
			8 < now.getMonth() ? now.getMonth() + 1 : '0' + (now.getMonth() + 1),
			now.getFullYear()
		].join('.');
		driver.Date = value;
		driver.SetDate();
		if(!driver.ResultCode){// если запрос выполнен
			driver.ConfirmDate();
			if(!driver.ResultCode){// если запрос выполнен
			}else error = 18;
		}else error = 18;
	};
	// инициализируем таблицу
	if(!error && !isUpdated){// если нужно выполнить
		driver.InitTable();
		if(!driver.ResultCode){// если запрос выполнен
			isUpdated = true;
		}else error = 19;
	};
	// восстанавливаем значения таблиц
	if(!error){// если нету ошибок
		for(var i in table){// таблицы
			for(var j in table[i]){// ряды
				for(var k in table[i][j]){// поля
					value = table[i][j][k];
					driver.TableNumber = i;
					driver.RowNumber = j;
					driver.FieldNumber = k;
					driver.GetFieldStruct();// запрашиваем структуру
					if(!driver.ResultCode){// если данные получены
						if(driver.FieldType) driver.ValueOfFieldString = value;
						else driver.ValueOfFieldInteger = value;
						driver.WriteTable();// изменяем данные
					};
				};
			};
		};
	};
	// проверяем и изменяем скорость
	if(!error){// если нету ошибок
		driver.GetExchangeParam();
		if(!driver.ResultCode){// если запрос выполнен
			value = driver.BaudRate;
			if(value != speed){// если нужно изменить
				driver.BaudRate = speed;
				driver.SetExchangeParam();
				if(!driver.ResultCode){// если запрос выполнен
				}else error = 20;
			};
		}else error = 20;
	};
	// перезагружаем кассу
	if(!error){// если нету ошибок
		driver.RebootKKT();
		if(!driver.ResultCode){// если данные получены
		}else error = 21;
	};
	// завершаем сценарий кодом
	wsh.quit(error);
})(WSH);