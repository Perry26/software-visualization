import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.wait import WebDriverWait

# Define helper for splitting results
def splitResult(s: str):
    a1 = s.split("-------")
    a2 = []
    for i in a1:
        if i == "": 
            continue
        j = i.split("_______\n")
        j[0] = j[0].split('-')
        j[1] = j[1].strip()
        a2.append(j)
    return a2

# Load the page
options = Options()
#options.add_argument("--headless=new") # For chrome
options.add_argument("--headless") # For firefox
#driver = webdriver.Chrome(options=options)
driver = webdriver.Firefox(options=options)
driver.get('http://localhost:5173/batch-eval')

#Define helper: get element by idea
def element(s: str) -> WebElement:
    return driver.find_element(By.CSS_SELECTOR, s)


# Give input
json_uploader = element("#json-uploader")
json_uploader.send_keys(os.getcwd()+"/input-data/jhotdraw-trc-sum-rs.json")
# Documentation says the following line is necessary, but it crashed for me.
# However, commenting it out works on Firefox, but not for Chrome
# json_uploader.click()

# Run evaluation
element("#run-button").click()

# Wait for result
wait = WebDriverWait(driver, 2000)
wait.until(lambda _: element('#done-output').text == 'Done')

# Parse results
hashes = splitResult(element('#hash-output').text)
drawSettings = splitResult(element('#settings-output').text)
evaluationResults = splitResult(element('#evaluation-output').text)
failed = splitResult(element('#failed-output').text)

# More parsing (Dealing with data in python can be a hassle)
for [id, hash] in hashes:
    evaluationResultTempArray = [i for i in evaluationResults if i[0] == id]
    if len(evaluationResultTempArray) > 0:
        evaluationResult = evaluationResultTempArray[0][1] + ";" + hash
    else: 
        evaluationResult = False
    
    drawSettingsTempArray = [i for i in drawSettings if i[0] == [id[0], '0']]
    if len(drawSettingsTempArray) > 0:
        drawSetting = drawSettingsTempArray[0][1] + ";" + hash
    else:
        drawSetting = False
    
    # Now, we can save the data
    if drawSettings:
        with open("output-data/json/" + hash + ".json", "w") as f:
            print("Write drawSettings: " + hash)
            f.write(drawSetting)
    
    if evaluationResult:
        with open("output-data/evaluationResults.csv", "a") as f:
            print("Write Evaluation: " + hash)
            f.write(evaluationResult + "\n")
    
    with open("output-data/hashes", "a") as f:
        print("Write hash: " + hash)
        f.write(hash + "\n")

# Finally, make a list of cases resulting in a fail
for [id, s] in failed:
    [hash, fileName] = s.split('\n')
    with open("output-data/fails.csv", "a") as f:
        print("Write fail: " + hash)
        f.write(hash + ";" + fileName + "\n")

    


#input("Press Enter to continue...")
driver.quit()
