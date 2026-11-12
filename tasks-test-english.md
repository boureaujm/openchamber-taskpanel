# Task Panel Test Plan

## 1. Prepare the environment

### 1.1 Install dependencies [x]

- Check the Bun version
- Install project dependencies

### 1.2 Configure environment variables [x]

- Create the local configuration file
- Verify the configured paths

### 1.3 Prepare test data [ ]

- Copy the test fixtures
- Add an incomplete dataset
- Verify missing values

## 2. Build the interface

### 2.1 Create the structure [x]

- Add the header
- Add the progress bar

### 2.2 Add task sections [ ]

- Show an expanded section
- Show a collapsed section
- Preserve the state after refresh

### 2.3 Test nested tasks [ ]

  - Add a level-two task
    - Add a level-three task
    - Add another level-three task
  - Verify the visual indentation

## 3. Test interactions

### 3.1 Select a file [ ]

- Open the file picker
- Navigate into a folder
- Select a Markdown file

### 3.2 Hide completed tasks [x]

- Click the eye button
- Verify that completed tasks disappear

### 3.3 Jump to the active task [ ]

- Click the current-task strip
- Scroll to the active task

## 4. Validate edge cases

### 4.1 Partially completed plan [ ]

- Verify the global task count
- Verify each section count

### 4.2 Completed section [x]

- Confirm that the section can be collapsed
- Verify the completed count color

### 4.3 Empty plan [ ]

- Display the empty-state message

## 5. Release checks

### 5.1 Verify quality [ ]

- Run the unit tests
- Run the production build
- Check the dark theme
- Check the light theme

### 5.2 Document the release [ ]

- Add a release note
- Review the installation instructions

- Verify the final status [x]
