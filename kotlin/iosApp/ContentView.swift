import SwiftUI
import client  // The Kotlin/Compose Multiplatform framework

struct ContentView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        // Calls the Kotlin fun MainViewController() defined in iosMain/Main.kt
        Main_iosKt.MainViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
