export default function ShortcutsSettings() {
  return (
    <div className="space-y-8 p-4 pt-3">
      <section>
        <h2 className="mb-4 font-semibold text-lg text-neutral-800 dark:text-neutral-100">Application</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">New Chat</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Create a new chat.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              ⌘ N
            </kbd>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">Toggle Sidebar</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Show or hide the sidebar.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              ⌘ B
            </kbd>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">Zoom In</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Increase the zoom level.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              ⌘ +
            </kbd>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">Zoom Out</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Decrease the zoom level.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              ⌘ -
            </kbd>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-lg text-neutral-800 dark:text-neutral-100">Chat</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">Send Message</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Send the current message.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              Enter
            </kbd>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">New Line</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Insert a new line.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              Shift + Enter
            </kbd>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-lg text-neutral-800 dark:text-neutral-100">Navigation</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">Go to Settings</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Open settings.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              ⌘ ,
            </kbd>
          </div>
        </div>
      </section>
    </div>
  );
}
